package store

import (
	"context"
	"time"

	"homework-studio/internal/domain"
)

// StudentReport is one auto-generated weekly report (latest per student).
type StudentReport struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	StudentID      string    `json:"student_id"`
	PeriodEnd      string    `json:"period_end"`
	OverallAverage float64   `json:"overall_average"`
	HomeworksDone  int       `json:"homeworks_done"`
	TopSubject     string    `json:"top_subject"`
	Narrative      string    `json:"narrative"`
	RecapJSON      string    `json:"recap_json"`
	GeneratedAt    time.Time `json:"generated_at"`
}

// StudentRef is a lightweight (id, tenant) pair for scheduler iteration.
type StudentRef struct {
	ID       string
	TenantID string
}

// AllStudents lists every student across tenants (used by the scheduler).
func (s *Store) AllStudents(ctx context.Context) ([]StudentRef, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, tenant_id FROM students`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StudentRef{}
	for rows.Next() {
		var r StudentRef
		if err := rows.Scan(&r.ID, &r.TenantID); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// UpsertStudentReport writes (or replaces) a student's latest report.
func (s *Store) UpsertStudentReport(ctx context.Context, r *StudentReport) error {
	if r.ID == "" {
		r.ID = domain.NewID()
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO student_reports
		   (id, tenant_id, student_id, overall_average, homeworks_done, top_subject, narrative, recap_json, generated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
		 ON CONFLICT (student_id) DO UPDATE SET
		   overall_average = EXCLUDED.overall_average,
		   homeworks_done  = EXCLUDED.homeworks_done,
		   top_subject     = EXCLUDED.top_subject,
		   narrative       = EXCLUDED.narrative,
		   recap_json      = EXCLUDED.recap_json,
		   period_end      = CURRENT_DATE,
		   generated_at    = now()`,
		r.ID, r.TenantID, r.StudentID, r.OverallAverage, r.HomeworksDone, r.TopSubject, r.Narrative, r.RecapJSON)
	return err
}

// GetLatestStudentReport returns a student's most recent auto-generated report.
func (s *Store) GetLatestStudentReport(ctx context.Context, tenantID, studentID string) (*StudentReport, error) {
	r := &StudentReport{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, student_id, to_char(period_end,'YYYY-MM-DD'),
		        overall_average, homeworks_done, top_subject, narrative, recap_json, generated_at
		 FROM student_reports WHERE tenant_id=$1 AND student_id=$2`, tenantID, studentID).
		Scan(&r.ID, &r.TenantID, &r.StudentID, &r.PeriodEnd, &r.OverallAverage,
			&r.HomeworksDone, &r.TopSubject, &r.Narrative, &r.RecapJSON, &r.GeneratedAt)
	if err != nil {
		return nil, noRows(err)
	}
	return r, nil
}
