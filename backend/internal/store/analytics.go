package store

import (
	"context"
	"sort"
	"time"
)

// --- School engagement (gamification, school-wide) ---

type SchoolEngagement struct {
	Students      int         `json:"students"`
	ActiveToday   int         `json:"active_today"`
	AvgStreak     float64     `json:"avg_streak"`
	TotalXP       int         `json:"total_xp"`
	BadgesAwarded int         `json:"badges_awarded"`
	Leaders       []LeaderRow `json:"leaders"`
}

func (s *Store) SchoolEngagement(ctx context.Context, tenantID string) (*SchoolEngagement, error) {
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
	by := map[string]*agg{}
	for rows.Next() {
		var sid, name, day string
		var pct float64
		var isExam bool
		if err := rows.Scan(&sid, &name, &pct, &isExam, &day); err != nil {
			return nil, err
		}
		if by[sid] == nil {
			by[sid] = &agg{name: name}
		}
		by[sid].atts = append(by[sid].atts, attempt{percent: pct, isExam: isExam, day: day})
	}

	eng := &SchoolEngagement{Leaders: []LeaderRow{}}
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM students WHERE tenant_id=$1`, tenantID).Scan(&eng.Students)

	today := time.Now().Format("2006-01-02")
	streakSum, streakN := 0.0, 0
	for _, a := range by {
		g := gamify(a.atts)
		eng.TotalXP += g.XP
		eng.BadgesAwarded += countEarned(g.Badges)
		if g.Streak > 0 {
			streakSum += float64(g.Streak)
			streakN++
		}
		for _, at := range a.atts {
			if at.day == today {
				eng.ActiveToday++
				break
			}
		}
		eng.Leaders = append(eng.Leaders, LeaderRow{Name: a.name, XP: g.XP, Level: g.Level, Streak: g.Streak})
	}
	if streakN > 0 {
		eng.AvgStreak = streakSum / float64(streakN)
	}
	sort.Slice(eng.Leaders, func(i, j int) bool {
		if eng.Leaders[i].Streak != eng.Leaders[j].Streak {
			return eng.Leaders[i].Streak > eng.Leaders[j].Streak
		}
		return eng.Leaders[i].XP > eng.Leaders[j].XP
	})
	if len(eng.Leaders) > 5 {
		eng.Leaders = eng.Leaders[:5]
	}
	for i := range eng.Leaders {
		eng.Leaders[i].Rank = i + 1
	}
	return eng, nil
}

// --- School trend (last N days) ---

type TrendPoint struct {
	Date  string   `json:"date"`
	Avg   *float64 `json:"avg"` // null on days with no exams
	Count int      `json:"count"`
}

func (s *Store) SchoolTrend(ctx context.Context, tenantID string, days int) ([]TrendPoint, error) {
	if days <= 0 {
		days = 14
	}
	rows, err := s.pool.Query(ctx,
		`SELECT to_char(finished_at::date,'YYYY-MM-DD'), AVG(percent), COUNT(*)
		 FROM practice_sets
		 WHERE tenant_id=$1 AND status='finished' AND exam_id IS NOT NULL
		   AND finished_at >= (now() - make_interval(days => $2))
		 GROUP BY 1`, tenantID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	byDay := map[string]TrendPoint{}
	for rows.Next() {
		var d string
		var avg float64
		var c int
		if err := rows.Scan(&d, &avg, &c); err != nil {
			return nil, err
		}
		a := avg
		byDay[d] = TrendPoint{Date: d, Avg: &a, Count: c}
	}
	out := make([]TrendPoint, 0, days)
	for i := days - 1; i >= 0; i-- {
		d := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		if p, ok := byDay[d]; ok {
			out = append(out, p)
		} else {
			out = append(out, TrendPoint{Date: d, Avg: nil, Count: 0})
		}
	}
	return out, nil
}

// --- Teaching & exam analytics ---

type ExamStat struct {
	Title      string   `json:"title"`
	Subject    string   `json:"subject"`
	Status     string   `json:"status"`
	Takers     int      `json:"takers"`
	Average    float64  `json:"average"`
	Hardest    string   `json:"hardest"`
	HardestPct *float64 `json:"hardest_pct"`
}

type TeachingOverview struct {
	Materials      int        `json:"materials"`
	ExamsDraft     int        `json:"exams_draft"`
	ExamsReview    int        `json:"exams_review"`
	ExamsPublished int        `json:"exams_published"`
	PendingReview  int        `json:"pending_review"`
	Exams          []ExamStat `json:"exams"`
}

func (s *Store) TeachingOverview(ctx context.Context, tenantID string) (*TeachingOverview, error) {
	t := &TeachingOverview{Exams: []ExamStat{}}
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM materials WHERE tenant_id=$1`, tenantID).Scan(&t.Materials)
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FILTER (WHERE status='draft'), COUNT(*) FILTER (WHERE status='needs_review'),
		        COUNT(*) FILTER (WHERE status='published')
		 FROM exams WHERE tenant_id=$1`, tenantID).Scan(&t.ExamsDraft, &t.ExamsReview, &t.ExamsPublished)
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM questions q JOIN exams e ON e.id=q.exam_id
		 WHERE e.tenant_id=$1 AND q.needs_review=true AND q.approved=false`, tenantID).Scan(&t.PendingReview)

	rows, err := s.pool.Query(ctx,
		`SELECT e.id, e.title, COALESCE(sub.name,''), e.status
		 FROM exams e LEFT JOIN subjects sub ON sub.id=e.subject_id
		 WHERE e.tenant_id=$1 ORDER BY (e.status='published') DESC, e.created_at DESC`, tenantID)
	if err != nil {
		return t, nil
	}
	defer rows.Close()
	type row struct{ id, title, subject, status string }
	exams := []row{}
	for rows.Next() {
		var r row
		if rows.Scan(&r.id, &r.title, &r.subject, &r.status) == nil {
			exams = append(exams, r)
		}
	}
	for _, e := range exams {
		es := ExamStat{Title: e.title, Subject: e.subject, Status: e.status}
		_ = s.pool.QueryRow(ctx,
			`SELECT COUNT(*), COALESCE(AVG(percent),0) FROM practice_sets
			 WHERE tenant_id=$1 AND exam_id=$2 AND status='finished'`, tenantID, e.id).
			Scan(&es.Takers, &es.Average)
		var stem string
		var frac float64
		err := s.pool.QueryRow(ctx,
			`SELECT q.stem, AVG(CASE WHEN pa.is_correct THEN 1.0 ELSE 0.0 END) AS pct
			 FROM practice_answers pa
			 JOIN practice_sets ps ON ps.id = pa.practice_set_id
			 JOIN questions q ON q.id = pa.question_id
			 WHERE ps.tenant_id=$1 AND ps.exam_id=$2
			 GROUP BY q.stem ORDER BY pct ASC, COUNT(*) DESC LIMIT 1`, tenantID, e.id).Scan(&stem, &frac)
		if err == nil {
			es.Hardest = stem
			p := frac * 100
			es.HardestPct = &p
		}
		t.Exams = append(t.Exams, es)
	}
	return t, nil
}
