package store

import (
	"context"
	"encoding/json"

	"homework-studio/internal/domain"
)

// RemediationSet is a coach-recommended practice set surfaced on the student home.
type RemediationSet struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	Color   string `json:"color"`
	Count   int    `json:"count"`
	Reason  string `json:"reason"`
}

// WeakestSubject returns the subject (id + name + color) the student scores lowest
// in across finished attempts. Returns ok=false when there's nothing graded yet.
func (s *Store) WeakestSubject(ctx context.Context, tenantID, studentID string) (id, name, color string, avg float64, ok bool) {
	err := s.pool.QueryRow(ctx,
		`SELECT sub.id, sub.name, sub.color, AVG(ps.percent)
		   FROM practice_sets ps
		   JOIN subjects sub ON sub.id = ps.subject_id
		  WHERE ps.tenant_id=$1 AND ps.student_id=$2 AND ps.status='finished'
		  GROUP BY sub.id, sub.name, sub.color
		  ORDER BY AVG(ps.percent) ASC
		  LIMIT 1`, tenantID, studentID).Scan(&id, &name, &color, &avg)
	if err != nil {
		return "", "", "", 0, false
	}
	return id, name, color, avg, true
}

// EnsureRemediationSet creates an OPEN, coach-recommended practice set in the given
// subject — unless the student already has one open (so re-runs don't pile up). It
// returns the set id, its question count, and whether a new one was created.
func (s *Store) EnsureRemediationSet(ctx context.Context, tenantID, studentID, subjectID string) (setID string, count int, created bool) {
	// Already have an open recommendation? Reuse it (idempotent across scheduler runs).
	var existing string
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM practice_sets
		  WHERE tenant_id=$1 AND student_id=$2 AND status='open' AND source='remediation'
		  ORDER BY created_at DESC LIMIT 1`, tenantID, studentID).Scan(&existing)
	if err == nil && existing != "" {
		return existing, 0, false
	}

	qs, err := s.ListQuestions(ctx, tenantID, subjectID, "", 5)
	if err != nil || len(qs) == 0 {
		return "", 0, false
	}
	qs = stripQuestions(qs)
	snap, _ := json.Marshal(qs)
	id := domain.NewID()
	_, err = s.pool.Exec(ctx,
		`INSERT INTO practice_sets (id, tenant_id, student_id, subject_id, status, snapshot, source)
		 VALUES ($1,$2,$3,$4,'open',$5,'remediation')`,
		id, tenantID, studentID, subjectID, snap)
	if err != nil {
		return "", 0, false
	}
	return id, len(qs), true
}

// CountRemediationSets counts the coach-recommended practice sets the automation
// has built in a tenant (durable, unlike the event log which resets each run).
func (s *Store) CountRemediationSets(ctx context.Context, tenantID string) int {
	var n int
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM practice_sets WHERE tenant_id=$1 AND source='remediation'`, tenantID).Scan(&n)
	return n
}

// OpenRemediationSets lists the student's open, coach-recommended sets.
func (s *Store) OpenRemediationSets(ctx context.Context, tenantID, studentID string) ([]RemediationSet, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ps.id, COALESCE(sub.name,''), COALESCE(sub.color,'#6366f1'),
		        COALESCE(jsonb_array_length(ps.snapshot),0)
		   FROM practice_sets ps
		   LEFT JOIN subjects sub ON sub.id = ps.subject_id
		  WHERE ps.tenant_id=$1 AND ps.student_id=$2 AND ps.status='open' AND ps.source='remediation'
		  ORDER BY ps.created_at DESC`, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RemediationSet{}
	for rows.Next() {
		var r RemediationSet
		if err := rows.Scan(&r.ID, &r.Subject, &r.Color, &r.Count); err != nil {
			return nil, err
		}
		r.Reason = "Your coach set this to help you get stronger in " + r.Subject + "."
		out = append(out, r)
	}
	return out, rows.Err()
}

// GetOpenSet loads an open practice set's stripped questions so the student can take
// it (used for coach-recommended remediation sets). It refuses finished sets.
func (s *Store) GetOpenSet(ctx context.Context, tenantID, setID string) (*domain.PracticeSet, []domain.Question, error) {
	ps, qs, err := s.GetPracticeSnapshot(ctx, tenantID, setID)
	if err != nil {
		return nil, nil, err
	}
	return ps, stripQuestions(qs), nil
}
