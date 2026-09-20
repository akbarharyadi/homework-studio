package store

import "context"

// ClassStats is the teacher dashboard summary — now sourced from exam attempts.
type ClassStats struct {
	Students        int              `json:"students"`
	ExamsTaken      int              `json:"exams_taken"`
	PendingReview   int              `json:"pending_review"` // AI questions awaiting the teacher
	AveragePercent  float64          `json:"average_percent"`
	ScoreBuckets    []BucketCount    `json:"score_buckets"`
	SubjectAverages []SubjectAverage `json:"subject_averages"`
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
		`SELECT COUNT(*) FROM practice_sets WHERE tenant_id=$1 AND status='finished'`, tenantID).
		Scan(&cs.ExamsTaken)

	// AI-generated exam questions still waiting for the teacher to review.
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM questions q JOIN exams e ON e.id=q.exam_id
		 WHERE e.tenant_id=$1 AND q.needs_review=true AND q.approved=false`, tenantID).
		Scan(&cs.PendingReview)

	_ = s.pool.QueryRow(ctx,
		`SELECT COALESCE(AVG(percent),0) FROM practice_sets WHERE tenant_id=$1 AND status='finished'`, tenantID).
		Scan(&cs.AveragePercent)

	buckets := []struct {
		label  string
		lo, hi float64
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
			`SELECT COUNT(*) FROM practice_sets
			 WHERE tenant_id=$1 AND status='finished' AND percent>=$2 AND percent<=$3`,
			tenantID, b.lo, b.hi).Scan(&n)
		cs.ScoreBuckets = append(cs.ScoreBuckets, BucketCount{Label: b.label, Count: n})
	}

	rows, err := s.pool.Query(ctx,
		`SELECT sub.name, sub.color, COALESCE(AVG(ps.percent),0) AS avg
		 FROM subjects sub
		 LEFT JOIN practice_sets ps ON ps.subject_id = sub.id AND ps.status='finished'
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

// ProgressPoint is one finished exam attempt in a child's timeline.
type ProgressPoint struct {
	ID      string  `json:"id"`
	Title   string  `json:"title"`
	Subject string  `json:"subject"`
	Percent float64 `json:"percent"`
	Status  string  `json:"status"`
	Date    string  `json:"date"`
}

// StudentProgress is the parent-facing view — now from exam attempts.
type StudentProgress struct {
	StudentID       string           `json:"student_id"`
	StudentName     string           `json:"student_name"`
	GradeLevel      string           `json:"grade_level"`
	OverallAverage  float64          `json:"overall_average"`
	Timeline        []ProgressPoint  `json:"timeline"`
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
		`SELECT COALESCE(AVG(percent),0) FROM practice_sets
		 WHERE tenant_id=$1 AND student_id=$2 AND status='finished'`, tenantID, studentID).
		Scan(&sp.OverallAverage)

	rows, err := s.pool.Query(ctx,
		`SELECT ps.id, COALESCE(e.title,'Practice'), COALESCE(sub.name,''), ps.percent, ps.status,
		        to_char(COALESCE(ps.finished_at, ps.created_at), 'YYYY-MM-DD')
		 FROM practice_sets ps
		 LEFT JOIN exams e ON e.id = ps.exam_id
		 LEFT JOIN subjects sub ON sub.id = ps.subject_id
		 WHERE ps.tenant_id=$1 AND ps.student_id=$2 AND ps.status='finished'
		 ORDER BY ps.finished_at ASC`, tenantID, studentID)
	if err != nil {
		return sp, nil
	}
	defer rows.Close()
	for rows.Next() {
		var p ProgressPoint
		if err := rows.Scan(&p.ID, &p.Title, &p.Subject, &p.Percent, &p.Status, &p.Date); err != nil {
			return sp, nil
		}
		sp.Timeline = append(sp.Timeline, p)
	}

	subRows, err := s.pool.Query(ctx,
		`SELECT sub.name, sub.color, COALESCE(AVG(ps.percent),0)
		 FROM subjects sub
		 JOIN practice_sets ps ON ps.subject_id = sub.id AND ps.status='finished'
		 WHERE sub.tenant_id=$1 AND ps.student_id=$2
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
