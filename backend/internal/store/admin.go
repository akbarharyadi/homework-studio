package store

import "context"

// CountUsersByRole counts users of a role in a tenant.
func (s *Store) CountUsersByRole(ctx context.Context, tenantID, role string) int {
	var n int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE tenant_id=$1 AND role=$2`, tenantID, role).Scan(&n)
	return n
}

// CountReports counts auto-generated reports in a tenant.
func (s *Store) CountReports(ctx context.Context, tenantID string) int {
	var n int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM student_reports WHERE tenant_id=$1`, tenantID).Scan(&n)
	return n
}

// LastReportTime returns the most recent report generation time (empty if none).
func (s *Store) LastReportTime(ctx context.Context, tenantID string) string {
	var t *string
	_ = s.pool.QueryRow(ctx,
		`SELECT to_char(MAX(generated_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') FROM student_reports WHERE tenant_id=$1`,
		tenantID).Scan(&t)
	if t == nil {
		return ""
	}
	return *t
}

// AdminStudentRow is one row in the school-wide monitoring table.
type AdminStudentRow struct {
	StudentID    string  `json:"student_id"`
	Name         string  `json:"name"`
	Grade        string  `json:"grade_level"`
	Average      float64 `json:"average"`
	Homeworks    int     `json:"homeworks"`
	NeedsReview  int     `json:"needs_review"`
	LastActivity string  `json:"last_activity"`
}

func (s *Store) AdminStudentRows(ctx context.Context, tenantID string) ([]AdminStudentRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT s.id, s.name, s.grade_level,
		    COALESCE(AVG(h.percent) FILTER (WHERE h.status='graded'), 0) AS avg,
		    COUNT(h.id) FILTER (WHERE h.status='graded') AS done,
		    COALESCE((SELECT COUNT(*) FROM review_tasks r JOIN homeworks hh ON hh.id=r.homework_id
		              WHERE hh.student_id=s.id AND r.status='open'), 0) AS needs_review,
		    COALESCE(to_char(MAX(h.created_at), 'YYYY-MM-DD'), '—') AS last
		 FROM students s
		 LEFT JOIN homeworks h ON h.student_id = s.id
		 WHERE s.tenant_id=$1
		 GROUP BY s.id, s.name, s.grade_level
		 ORDER BY avg DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AdminStudentRow{}
	for rows.Next() {
		var r AdminStudentRow
		if err := rows.Scan(&r.StudentID, &r.Name, &r.Grade, &r.Average, &r.Homeworks, &r.NeedsReview, &r.LastActivity); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// RecentReport is a row in the automation activity feed.
type RecentReport struct {
	StudentName    string  `json:"student_name"`
	OverallAverage float64 `json:"overall_average"`
	GeneratedAt    string  `json:"generated_at"`
}

func (s *Store) RecentReports(ctx context.Context, tenantID string, limit int) ([]RecentReport, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := s.pool.Query(ctx,
		`SELECT st.name, r.overall_average,
		        to_char(r.generated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		 FROM student_reports r JOIN students st ON st.id = r.student_id
		 WHERE r.tenant_id=$1
		 ORDER BY r.generated_at DESC LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RecentReport{}
	for rows.Next() {
		var r RecentReport
		if err := rows.Scan(&r.StudentName, &r.OverallAverage, &r.GeneratedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
