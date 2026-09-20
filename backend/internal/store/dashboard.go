package store

import "context"

// ClassStats is the teacher dashboard summary.
type ClassStats struct {
	Students         int              `json:"students"`
	HomeworksGraded  int              `json:"homeworks_graded"`
	NeedsReview      int              `json:"needs_review"`
	AveragePercent   float64          `json:"average_percent"`
	ScoreBuckets     []BucketCount    `json:"score_buckets"`
	SubjectAverages  []SubjectAverage `json:"subject_averages"`
}

type BucketCount struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type SubjectAverage struct {
	Subject string  `json:"subject"`
	Color   string  `json:"color"`
	Average float64 `json:"average"`
}

func (s *Store) ClassStats(ctx context.Context, tenantID string) (*ClassStats, error) {
	cs := &ClassStats{ScoreBuckets: []BucketCount{}, SubjectAverages: []SubjectAverage{}}

	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM students WHERE tenant_id=$1`, tenantID).Scan(&cs.Students)

	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM homeworks WHERE tenant_id=$1 AND status='graded'`, tenantID).
		Scan(&cs.HomeworksGraded)

	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM review_tasks WHERE tenant_id=$1 AND status='open'`, tenantID).
		Scan(&cs.NeedsReview)

	_ = s.pool.QueryRow(ctx,
		`SELECT COALESCE(AVG(percent),0) FROM homeworks WHERE tenant_id=$1 AND status='graded'`, tenantID).
		Scan(&cs.AveragePercent)

	// Score distribution buckets.
	buckets := []struct {
		label    string
		lo, hi   float64
	}{
		{"0–59", 0, 59.999},
		{"60–69", 60, 69.999},
		{"70–79", 70, 79.999},
		{"80–89", 80, 89.999},
		{"90–100", 90, 100.001},
	}
	for _, b := range buckets {
		var n int
		_ = s.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM homeworks
			 WHERE tenant_id=$1 AND status='graded' AND percent>=$2 AND percent<=$3`,
			tenantID, b.lo, b.hi).Scan(&n)
		cs.ScoreBuckets = append(cs.ScoreBuckets, BucketCount{Label: b.label, Count: n})
	}

	// Per-subject averages.
	rows, err := s.pool.Query(ctx,
		`SELECT sub.name, sub.color, COALESCE(AVG(h.percent),0) AS avg
		 FROM subjects sub
		 LEFT JOIN homeworks h ON h.subject_id = sub.id AND h.status='graded'
		 WHERE sub.tenant_id=$1
		 GROUP BY sub.name, sub.color
		 ORDER BY sub.name`, tenantID)
	if err != nil {
		return cs, nil // stats are best-effort
	}
	defer rows.Close()
	for rows.Next() {
		var sa SubjectAverage
		if err := rows.Scan(&sa.Subject, &sa.Color, &sa.Average); err != nil {
			return cs, nil
		}
		cs.SubjectAverages = append(cs.SubjectAverages, sa)
	}
	return cs, nil
}

// ProgressPoint is one graded homework in a child's timeline.
type ProgressPoint struct {
	HomeworkID string  `json:"homework_id"`
	Title      string  `json:"title"`
	Subject    string  `json:"subject"`
	Percent    float64 `json:"percent"`
	Status     string  `json:"status"`
	Date       string  `json:"date"`
}

// StudentProgress is the parent-facing view.
type StudentProgress struct {
	StudentID      string           `json:"student_id"`
	StudentName    string           `json:"student_name"`
	GradeLevel     string           `json:"grade_level"`
	OverallAverage float64          `json:"overall_average"`
	Timeline       []ProgressPoint  `json:"timeline"`
	SubjectAverages []SubjectAverage `json:"subject_averages"`
}

func (s *Store) StudentProgress(ctx context.Context, tenantID, studentID string) (*StudentProgress, error) {
	st, err := s.GetStudent(ctx, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	sp := &StudentProgress{
		StudentID:       st.ID,
		StudentName:     st.Name,
		GradeLevel:      st.GradeLevel,
		Timeline:        []ProgressPoint{},
		SubjectAverages: []SubjectAverage{},
	}

	_ = s.pool.QueryRow(ctx,
		`SELECT COALESCE(AVG(percent),0) FROM homeworks
		 WHERE tenant_id=$1 AND student_id=$2 AND status='graded'`, tenantID, studentID).
		Scan(&sp.OverallAverage)

	rows, err := s.pool.Query(ctx,
		`SELECT h.id, h.title, COALESCE(sub.name,h.detected_subject), h.percent, h.status,
		        to_char(h.created_at, 'YYYY-MM-DD')
		 FROM homeworks h
		 LEFT JOIN subjects sub ON sub.id = h.subject_id
		 WHERE h.tenant_id=$1 AND h.student_id=$2
		 ORDER BY h.created_at ASC`, tenantID, studentID)
	if err != nil {
		return sp, nil
	}
	defer rows.Close()
	for rows.Next() {
		var p ProgressPoint
		if err := rows.Scan(&p.HomeworkID, &p.Title, &p.Subject, &p.Percent, &p.Status, &p.Date); err != nil {
			return sp, nil
		}
		sp.Timeline = append(sp.Timeline, p)
	}

	subRows, err := s.pool.Query(ctx,
		`SELECT sub.name, sub.color, COALESCE(AVG(h.percent),0)
		 FROM subjects sub
		 JOIN homeworks h ON h.subject_id = sub.id AND h.status='graded'
		 WHERE sub.tenant_id=$1 AND h.student_id=$2
		 GROUP BY sub.name, sub.color ORDER BY sub.name`, tenantID, studentID)
	if err == nil {
		defer subRows.Close()
		for subRows.Next() {
			var sa SubjectAverage
			if err := subRows.Scan(&sa.Subject, &sa.Color, &sa.Average); err == nil {
				sp.SubjectAverages = append(sp.SubjectAverages, sa)
			}
		}
	}
	return sp, nil
}
