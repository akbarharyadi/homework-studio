package store

import (
	"context"
	"sort"
	"strings"
)

// FamilyChild is a summary card for one of a parent's children.
type FamilyChild struct {
	StudentID      string           `json:"student_id"`
	Name           string           `json:"name"`
	GradeLevel     string           `json:"grade_level"`
	Average        float64          `json:"average"`
	ExamsTaken     int              `json:"exams_taken"`
	Level          int              `json:"level"`
	XP             int              `json:"xp"`
	Streak         int              `json:"streak"`
	Badges         int              `json:"badges"`
	Subjects       []SubjectAverage `json:"subjects"`
	NeedsAttention bool             `json:"needs_attention"`
}

// Family returns a summary card (grades + engagement) for each of a parent's children.
func (s *Store) Family(ctx context.Context, tenantID, parentUserID string) ([]FamilyChild, error) {
	kids, err := s.ListStudentsForParent(ctx, tenantID, parentUserID)
	if err != nil {
		return nil, err
	}
	out := []FamilyChild{}
	for _, k := range kids {
		prog, _ := s.StudentProgress(ctx, tenantID, k.ID)
		atts, _ := s.loadAttempts(ctx, tenantID, k.ID)
		g := gamify(atts)
		fc := FamilyChild{
			StudentID: k.ID, Name: k.Name, GradeLevel: k.GradeLevel,
			Level: g.Level, XP: g.XP, Streak: g.Streak, Badges: countEarned(g.Badges),
			Subjects: []SubjectAverage{},
		}
		if prog != nil {
			fc.Average = prog.OverallAverage
			fc.ExamsTaken = len(prog.Timeline)
			fc.Subjects = prog.SubjectAverages
			fc.NeedsAttention = len(prog.Timeline) > 0 && prog.OverallAverage < 65
		}
		out = append(out, fc)
	}
	return out, nil
}

func countEarned(bs []Badge) int {
	n := 0
	for _, b := range bs {
		if b.Earned {
			n++
		}
	}
	return n
}

// SubjectVsClass compares a child's subject average to the class average.
type SubjectVsClass struct {
	Subject string  `json:"subject"`
	Color   string  `json:"color"`
	Child   float64 `json:"child"`
	Class   float64 `json:"class"`
	Delta   float64 `json:"delta"`
}

func (s *Store) CompareToClass(ctx context.Context, tenantID, studentID string) ([]SubjectVsClass, error) {
	prog, err := s.StudentProgress(ctx, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	cs, _ := s.ClassStats(ctx, tenantID)
	classBySubj := map[string]float64{}
	if cs != nil {
		for _, sa := range cs.SubjectAverages {
			classBySubj[sa.Subject] = sa.Average
		}
	}
	out := []SubjectVsClass{}
	for _, sa := range prog.SubjectAverages {
		cl := classBySubj[sa.Subject]
		out = append(out, SubjectVsClass{Subject: sa.Subject, Color: sa.Color, Child: sa.Average, Class: cl, Delta: sa.Average - cl})
	}
	return out, nil
}

// ActivityItem is one line in the parent "what's new" feed.
type ActivityItem struct {
	Kind string `json:"kind"` // report | alert | exam | badge
	Icon string `json:"icon"`
	Text string `json:"text"`
	Date string `json:"date"`
}

// FamilyActivity builds a parent-facing feed: automation events for the parent's
// children, newly published exams, and badges the children have earned.
func (s *Store) FamilyActivity(ctx context.Context, tenantID, parentUserID string) ([]ActivityItem, error) {
	kids, err := s.ListStudentsForParent(ctx, tenantID, parentUserID)
	if err != nil {
		return nil, err
	}
	items := []ActivityItem{}
	if len(kids) == 0 {
		return items, nil
	}
	ids := make([]string, len(kids))
	for i, k := range kids {
		ids[i] = k.ID
	}

	// Weekly reports + at-risk alerts the automation logged for these children.
	rows, err := s.pool.Query(ctx,
		`SELECT kind, message, to_char(created_at,'YYYY-MM-DD') FROM automation_events
		 WHERE tenant_id=$1 AND student_id = ANY($2) ORDER BY created_at DESC LIMIT 12`, tenantID, ids)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var kind, msg, date string
			if rows.Scan(&kind, &msg, &date) == nil {
				icon := "🗓️"
				if kind == "alert" {
					icon = "⚠️"
				}
				items = append(items, ActivityItem{Kind: kind, Icon: icon, Text: msg, Date: date})
			}
		}
	}

	// Recently published exams (relevant to every parent).
	erows, err := s.pool.Query(ctx,
		`SELECT title, to_char(published_at,'YYYY-MM-DD') FROM exams
		 WHERE tenant_id=$1 AND status='published' AND published_at IS NOT NULL
		 ORDER BY published_at DESC LIMIT 3`, tenantID)
	if err == nil {
		defer erows.Close()
		for erows.Next() {
			var title, date string
			if erows.Scan(&title, &date) == nil {
				items = append(items, ActivityItem{Kind: "exam", Icon: "📝", Text: "New exam published: " + title, Date: date})
			}
		}
	}

	sort.SliceStable(items, func(i, j int) bool { return items[i].Date > items[j].Date })

	// Badges the children have earned (no timestamp — shown after the dated items).
	for _, k := range kids {
		atts, _ := s.loadAttempts(ctx, tenantID, k.ID)
		g := gamify(atts)
		shown := 0
		for _, b := range g.Badges {
			if b.Earned {
				items = append(items, ActivityItem{
					Kind: "badge", Icon: b.Emoji,
					Text: firstName(k.Name) + " earned the “" + b.Name + "” badge",
				})
				shown++
				if shown >= 2 {
					break
				}
			}
		}
	}
	return items, nil
}

func firstName(name string) string {
	if i := strings.IndexByte(name, ' '); i > 0 {
		return name[:i]
	}
	return name
}
