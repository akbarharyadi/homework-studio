package store

import (
	"context"

	"homework-studio/internal/domain"
)

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

// CountGeneratedExams counts exams the AI produced from uploaded material.
func (s *Store) CountGeneratedExams(ctx context.Context, tenantID string) int {
	var n int
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM exams WHERE tenant_id=$1 AND material_id IS NOT NULL`, tenantID).Scan(&n)
	return n
}

// CountPublishedExams counts exams that reached students (auto- or teacher-published).
func (s *Store) CountPublishedExams(ctx context.Context, tenantID string) int {
	var n int
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM exams WHERE tenant_id=$1 AND status='published'`, tenantID).Scan(&n)
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

// AdminStudentRow is one row in the school-wide monitoring table (from attempts).
type AdminStudentRow struct {
	StudentID    string  `json:"student_id"`
	Name         string  `json:"name"`
	Grade        string  `json:"grade_level"`
	Average      float64 `json:"average"`
	ExamsTaken   int     `json:"exams_taken"`
	LastActivity string  `json:"last_activity"`
}

func (s *Store) AdminStudentRows(ctx context.Context, tenantID string) ([]AdminStudentRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT s.id, s.name, s.grade_level,
		    COALESCE(AVG(ps.percent) FILTER (WHERE ps.status='finished' AND ps.exam_id IS NOT NULL), 0) AS avg,
		    COUNT(ps.id) FILTER (WHERE ps.status='finished' AND ps.exam_id IS NOT NULL) AS done,
		    COALESCE(to_char(MAX(ps.finished_at) FILTER (WHERE ps.exam_id IS NOT NULL), 'YYYY-MM-DD'), '—') AS last
		 FROM students s
		 LEFT JOIN practice_sets ps ON ps.student_id = s.id
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
		if err := rows.Scan(&r.StudentID, &r.Name, &r.Grade, &r.Average, &r.ExamsTaken, &r.LastActivity); err != nil {
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

// --- Automation event log ---

// AutomationEvent is one action the automation took (report written / student flagged).
type AutomationEvent struct {
	Kind        string  `json:"kind"`
	StudentName string  `json:"student_name"`
	Message     string  `json:"message"`
	Value       float64 `json:"value"`
	CreatedAt   string  `json:"created_at"`
}

// ResetEvents clears a tenant's event log (the scheduler regenerates it each run).
func (s *Store) ResetEvents(ctx context.Context, tenantID string) {
	_, _ = s.pool.Exec(ctx, `DELETE FROM automation_events WHERE tenant_id=$1`, tenantID)
}

func (s *Store) InsertEvent(ctx context.Context, tenantID, kind, studentID, message string, value float64) {
	var sid *string
	if studentID != "" {
		sid = &studentID
	}
	_, _ = s.pool.Exec(ctx,
		`INSERT INTO automation_events (id, tenant_id, kind, student_id, message, value)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		domain.NewID(), tenantID, kind, sid, message, value)
}

func (s *Store) CountEventsByKind(ctx context.Context, tenantID, kind string) int {
	var n int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM automation_events WHERE tenant_id=$1 AND kind=$2`, tenantID, kind).Scan(&n)
	return n
}

func (s *Store) RecentEvents(ctx context.Context, tenantID string, limit int) ([]AutomationEvent, error) {
	if limit <= 0 {
		limit = 15
	}
	rows, err := s.pool.Query(ctx,
		`SELECT e.kind, COALESCE(st.name,''), e.message, e.value,
		        to_char(e.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		 FROM automation_events e
		 LEFT JOIN students st ON st.id = e.student_id
		 WHERE e.tenant_id=$1
		 ORDER BY e.created_at DESC, e.kind LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AutomationEvent{}
	for rows.Next() {
		var ev AutomationEvent
		if err := rows.Scan(&ev.Kind, &ev.StudentName, &ev.Message, &ev.Value, &ev.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, ev)
	}
	return out, rows.Err()
}
