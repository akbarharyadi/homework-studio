package store

import (
	"context"
	"math"
	"sort"
	"time"
)

// Gamification is a student's XP / level / streak / badges, derived entirely from
// their finished attempts (no separate tables).
type Gamification struct {
	XP            int              `json:"xp"`
	Level         int              `json:"level"`
	XPIntoLevel   int              `json:"xp_into_level"`
	XPForNext     int              `json:"xp_for_next"`
	LevelProgress int              `json:"level_progress"` // 0..100
	Streak        int              `json:"streak"`
	ExamsTaken    int              `json:"exams_taken"`
	PracticeDone  int              `json:"practice_done"`
	Average       float64          `json:"average"`
	Best          float64          `json:"best"`
	Subjects      []SubjectAverage `json:"subjects"`
	Badges        []Badge          `json:"badges"`
}

type Badge struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Emoji  string `json:"emoji"`
	Earned bool   `json:"earned"`
	Hint   string `json:"hint"`
}

const xpPerLevel = 120

// attempt is one finished practice_set used by the gamification math.
type attempt struct {
	percent float64
	isExam  bool
	subject string
	color   string
	day     string // YYYY-MM-DD
}

// xpFor scores an attempt: exams are worth more than free practice.
func xpFor(a attempt) int {
	if a.isExam {
		return 20 + int(a.percent/5) // 20..40
	}
	return 8 + int(a.percent/10) // 8..18
}

func levelFromXP(xp int) (level, into, forNext, pct int) {
	level = xp/xpPerLevel + 1
	into = xp % xpPerLevel
	forNext = xpPerLevel
	pct = int(math.Round(float64(into) / float64(xpPerLevel) * 100))
	return
}

// streakDays counts consecutive calendar days (ending today or yesterday) that have
// at least one attempt.
func streakDays(days map[string]bool) int {
	if len(days) == 0 {
		return 0
	}
	today := time.Now()
	start := today
	if !days[today.Format("2006-01-02")] {
		start = today.AddDate(0, 0, -1) // allow the streak to be "as of yesterday"
		if !days[start.Format("2006-01-02")] {
			return 0
		}
	}
	streak := 0
	for d := start; days[d.Format("2006-01-02")]; d = d.AddDate(0, 0, -1) {
		streak++
	}
	return streak
}

func (s *Store) loadAttempts(ctx context.Context, tenantID, studentID string) ([]attempt, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ps.percent, ps.exam_id IS NOT NULL, COALESCE(sub.name,''), COALESCE(sub.color,'#6366f1'),
		        to_char(COALESCE(ps.finished_at, ps.created_at),'YYYY-MM-DD')
		 FROM practice_sets ps LEFT JOIN subjects sub ON sub.id = ps.subject_id
		 WHERE ps.tenant_id=$1 AND ps.student_id=$2 AND ps.status='finished'`, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []attempt{}
	for rows.Next() {
		var a attempt
		if err := rows.Scan(&a.percent, &a.isExam, &a.subject, &a.color, &a.day); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func gamify(atts []attempt) Gamification {
	g := Gamification{Subjects: []SubjectAverage{}, Badges: []Badge{}}
	days := map[string]bool{}
	subjSum := map[string]float64{}
	subjCnt := map[string]int{}
	subjColor := map[string]string{}
	examScores := []float64{}
	highCount := 0
	perfect := false

	for _, a := range atts {
		g.XP += xpFor(a)
		days[a.day] = true
		if a.isExam {
			g.ExamsTaken++
			examScores = append(examScores, a.percent)
			if a.percent >= g.Best {
				g.Best = a.percent
			}
			if a.percent >= 80 {
				highCount++
			}
			if a.percent >= 100 {
				perfect = true
			}
			if a.subject != "" {
				subjSum[a.subject] += a.percent
				subjCnt[a.subject]++
				subjColor[a.subject] = a.color
			}
		} else {
			g.PracticeDone++
		}
	}

	if len(examScores) > 0 {
		var sum float64
		for _, v := range examScores {
			sum += v
		}
		g.Average = sum / float64(len(examScores))
	}
	g.Level, g.XPIntoLevel, g.XPForNext, g.LevelProgress = levelFromXP(g.XP)
	g.Streak = streakDays(days)

	subjectMastered := false
	names := make([]string, 0, len(subjSum))
	for name := range subjSum {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		avg := subjSum[name] / float64(subjCnt[name])
		g.Subjects = append(g.Subjects, SubjectAverage{Subject: name, Color: subjColor[name], Average: avg})
		if avg >= 80 && subjCnt[name] >= 2 {
			subjectMastered = true
		}
	}

	total := g.ExamsTaken + g.PracticeDone
	g.Badges = []Badge{
		{ID: "first", Name: "First steps", Emoji: "🎉", Earned: g.ExamsTaken >= 1, Hint: "Finish your first exam"},
		{ID: "perfect", Name: "Perfect!", Emoji: "🥇", Earned: perfect, Hint: "Score 100% on an exam"},
		{ID: "sharp", Name: "Sharpshooter", Emoji: "🎯", Earned: highCount >= 3, Hint: "Score 80%+ on 3 exams"},
		{ID: "master", Name: "Subject master", Emoji: "📚", Earned: subjectMastered, Hint: "Average 80%+ in a subject"},
		{ID: "explorer", Name: "Explorer", Emoji: "🧭", Earned: len(subjCnt) >= 2, Hint: "Take exams in 2 subjects"},
		{ID: "streak3", Name: "On fire", Emoji: "🔥", Earned: g.Streak >= 3, Hint: "Practise 3 days in a row"},
		{ID: "streak7", Name: "Unstoppable", Emoji: "⚡", Earned: g.Streak >= 7, Hint: "Practise 7 days in a row"},
		{ID: "century", Name: "Century club", Emoji: "💯", Earned: total >= 10, Hint: "Complete 10 quizzes"},
	}
	return g
}

// StudentGamification computes a student's XP, level, streak, and badges.
func (s *Store) StudentGamification(ctx context.Context, tenantID, studentID string) (*Gamification, error) {
	atts, err := s.loadAttempts(ctx, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	g := gamify(atts)
	return &g, nil
}

// LeaderRow is one line of the class leaderboard.
type LeaderRow struct {
	Rank   int    `json:"rank"`
	Name   string `json:"name"`
	XP     int    `json:"xp"`
	Level  int    `json:"level"`
	Streak int    `json:"streak"`
	IsMe   bool   `json:"is_me"`
}

// Leaderboard ranks every student in the tenant by XP (computed from attempts).
func (s *Store) Leaderboard(ctx context.Context, tenantID, meStudentID string) ([]LeaderRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ps.student_id, st.name, ps.percent, ps.exam_id IS NOT NULL,
		        to_char(COALESCE(ps.finished_at, ps.created_at),'YYYY-MM-DD')
		 FROM practice_sets ps JOIN students st ON st.id = ps.student_id
		 WHERE ps.tenant_id=$1 AND ps.status='finished'`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type agg struct {
		name string
		atts []attempt
	}
	byStudent := map[string]*agg{}
	for rows.Next() {
		var sid, name, day string
		var percent float64
		var isExam bool
		if err := rows.Scan(&sid, &name, &percent, &isExam, &day); err != nil {
			return nil, err
		}
		if byStudent[sid] == nil {
			byStudent[sid] = &agg{name: name}
		}
		byStudent[sid].atts = append(byStudent[sid].atts, attempt{percent: percent, isExam: isExam, day: day})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Also include students with no attempts (0 XP), so the whole class shows.
	nameRows, _ := s.pool.Query(ctx, `SELECT id, name FROM students WHERE tenant_id=$1`, tenantID)
	if nameRows != nil {
		defer nameRows.Close()
		for nameRows.Next() {
			var id, name string
			if nameRows.Scan(&id, &name) == nil && byStudent[id] == nil {
				byStudent[id] = &agg{name: name}
			}
		}
	}

	out := make([]LeaderRow, 0, len(byStudent))
	for sid, a := range byStudent {
		g := gamify(a.atts)
		out = append(out, LeaderRow{Name: a.name, XP: g.XP, Level: g.Level, Streak: g.Streak, IsMe: sid == meStudentID})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].XP != out[j].XP {
			return out[i].XP > out[j].XP
		}
		return out[i].Name < out[j].Name
	})
	for i := range out {
		out[i].Rank = i + 1
	}
	return out, nil
}
