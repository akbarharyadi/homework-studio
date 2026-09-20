package store

import (
	"context"
	"encoding/json"
	"time"

	"homework-studio/internal/domain"
)

func (s *Store) CreateExam(ctx context.Context, e *domain.Exam) error {
	if e.ID == "" {
		e.ID = domain.NewID()
	}
	if e.Status == "" {
		e.Status = domain.ExamDraft
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO exams (id, tenant_id, subject_id, material_id, title, status, question_count, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		e.ID, e.TenantID, e.SubjectID, e.MaterialID, e.Title, e.Status, e.QuestionCount, e.CreatedBy)
	return err
}

func (s *Store) SetExamStatus(ctx context.Context, id, status string) {
	_, _ = s.pool.Exec(ctx, `UPDATE exams SET status=$2 WHERE id=$1`, id, status)
}

// ExamApprovedQuestions returns an exam's approved questions (used by the seed to
// snapshot reviewable attempts).
func (s *Store) ExamApprovedQuestions(ctx context.Context, examID string) ([]domain.Question, error) {
	return s.examQuestions(ctx, examID, true)
}

// GetExam returns an exam and its questions (with answers — for the teacher's review).
func (s *Store) GetExam(ctx context.Context, tenantID, id string) (*domain.Exam, []domain.Question, error) {
	e := &domain.Exam{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, subject_id, material_id, title, status, question_count,
		        COALESCE(created_by,''), created_at, published_at
		 FROM exams WHERE tenant_id=$1 AND id=$2`, tenantID, id).
		Scan(&e.ID, &e.TenantID, &e.SubjectID, &e.MaterialID, &e.Title, &e.Status,
			&e.QuestionCount, &e.CreatedBy, &e.CreatedAt, &e.PublishedAt)
	if err != nil {
		return nil, nil, noRows(err)
	}
	qs, err := s.examQuestions(ctx, id, false)
	if err != nil {
		return nil, nil, err
	}
	return e, qs, nil
}

// examQuestions returns an exam's questions (flagged first); onlyApproved limits it
// to the approved set (what a student actually takes).
func (s *Store) examQuestions(ctx context.Context, examID string, onlyApproved bool) ([]domain.Question, error) {
	q := `SELECT id, tenant_id, subject_id, topic, difficulty, stem, options, answer,
	         explanation, marks, negative_marks, ai_generated, exam_id, confidence, needs_review, approved
	      FROM questions WHERE exam_id=$1`
	if onlyApproved {
		q += " AND approved=true"
	}
	q += " ORDER BY needs_review DESC, id"
	rows, err := s.pool.Query(ctx, q, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Question{}
	for rows.Next() {
		var qq domain.Question
		var opts []byte
		if err := rows.Scan(&qq.ID, &qq.TenantID, &qq.SubjectID, &qq.Topic, &qq.Difficulty,
			&qq.Stem, &opts, &qq.Answer, &qq.Explanation, &qq.Marks, &qq.NegativeMarks,
			&qq.AIGenerated, &qq.ExamID, &qq.Confidence, &qq.NeedsReview, &qq.Approved); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(opts, &qq.Options)
		out = append(out, qq)
	}
	return out, rows.Err()
}

// ExamRow is a teacher list-view row.
type ExamRow struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Subject       string `json:"subject"`
	Status        string `json:"status"`
	QuestionCount int    `json:"question_count"`
	Flagged       int    `json:"flagged"`
	CreatedAt     string `json:"created_at"`
}

func (s *Store) ListExams(ctx context.Context, tenantID, status string) ([]ExamRow, error) {
	q := `SELECT e.id, e.title, COALESCE(sub.name,''), e.status,
	        (SELECT COUNT(*) FROM questions q WHERE q.exam_id=e.id),
	        (SELECT COUNT(*) FROM questions q WHERE q.exam_id=e.id AND q.needs_review=true AND q.approved=false),
	        to_char(e.created_at,'YYYY-MM-DD')
	     FROM exams e LEFT JOIN subjects sub ON sub.id=e.subject_id
	     WHERE e.tenant_id=$1`
	args := []any{tenantID}
	if status != "" {
		args = append(args, status)
		q += " AND e.status=$2"
	}
	q += " ORDER BY e.created_at DESC"
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExamRow{}
	for rows.Next() {
		var r ExamRow
		if err := rows.Scan(&r.ID, &r.Title, &r.Subject, &r.Status, &r.QuestionCount, &r.Flagged, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// PublishExam approves the remaining questions and publishes the exam to students.
func (s *Store) PublishExam(ctx context.Context, tenantID, id string) error {
	// Ownership check.
	var owned bool
	_ = s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM exams WHERE tenant_id=$1 AND id=$2)`, tenantID, id).Scan(&owned)
	if !owned {
		return ErrNotFound
	}
	_, _ = s.pool.Exec(ctx, `UPDATE questions SET approved=true, needs_review=false WHERE exam_id=$1`, id)
	var n int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM questions WHERE exam_id=$1 AND approved=true`, id).Scan(&n)
	_, err := s.pool.Exec(ctx,
		`UPDATE exams SET status='published', question_count=$3, published_at=$4 WHERE tenant_id=$1 AND id=$2`,
		tenantID, id, n, time.Now())
	return err
}

// DiscardExamQuestion removes one generated question from an exam (teacher rejected it).
func (s *Store) DiscardExamQuestion(ctx context.Context, tenantID, examID, qid string) error {
	ct, err := s.pool.Exec(ctx,
		`DELETE FROM questions WHERE id=$1 AND exam_id=$2
		   AND exam_id IN (SELECT id FROM exams WHERE tenant_id=$3)`, qid, examID, tenantID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// PublishedExamRow is what a student sees in the exam list.
type PublishedExamRow struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Subject       string `json:"subject"`
	SubjectID     string `json:"subject_id"`
	QuestionCount int    `json:"question_count"`
}

func (s *Store) ListPublishedExams(ctx context.Context, tenantID string) ([]PublishedExamRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT e.id, e.title, COALESCE(sub.name,''), COALESCE(e.subject_id,''), e.question_count
		 FROM exams e LEFT JOIN subjects sub ON sub.id=e.subject_id
		 WHERE e.tenant_id=$1 AND e.status='published'
		 ORDER BY e.created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublishedExamRow{}
	for rows.Next() {
		var r PublishedExamRow
		if err := rows.Scan(&r.ID, &r.Title, &r.Subject, &r.SubjectID, &r.QuestionCount); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// StartExamAttempt snapshots a published exam's approved questions into a new
// practice_set (the attempt) and returns the student-safe questions (answers stripped).
func (s *Store) StartExamAttempt(ctx context.Context, tenantID, studentID, examID string) (*domain.PracticeSet, []domain.Question, error) {
	var status string
	var subjectID *string
	err := s.pool.QueryRow(ctx,
		`SELECT status, subject_id FROM exams WHERE tenant_id=$1 AND id=$2`, tenantID, examID).
		Scan(&status, &subjectID)
	if err != nil {
		return nil, nil, noRows(err)
	}
	if status != domain.ExamPublished {
		return nil, nil, ErrNotFound
	}
	qs, err := s.examQuestions(ctx, examID, true)
	if err != nil {
		return nil, nil, err
	}
	if len(qs) == 0 {
		return nil, nil, ErrNotFound
	}
	sid := ""
	if subjectID != nil {
		sid = *subjectID
	}
	ps := &domain.PracticeSet{ID: domain.NewID(), TenantID: tenantID, StudentID: studentID, SubjectID: sid}
	snap, _ := json.Marshal(qs)
	_, err = s.pool.Exec(ctx,
		`INSERT INTO practice_sets (id, tenant_id, student_id, subject_id, status, snapshot, exam_id)
		 VALUES ($1,$2,$3,$4,'open',$5,$6)`,
		ps.ID, ps.TenantID, ps.StudentID, ps.SubjectID, snap, examID)
	if err != nil {
		return nil, nil, err
	}
	return ps, stripQuestions(qs), nil
}

func stripQuestions(qs []domain.Question) []domain.Question {
	out := make([]domain.Question, len(qs))
	for i, q := range qs {
		q.Answer, q.Explanation = "", ""
		out[i] = q
	}
	return out
}
