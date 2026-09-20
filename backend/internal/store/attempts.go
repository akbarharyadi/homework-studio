package store

import (
	"context"
	"encoding/json"

	"homework-studio/internal/domain"
)

// AttemptRow is one finished attempt in a student's results list.
type AttemptRow struct {
	ID      string  `json:"id"`
	Title   string  `json:"title"`
	Subject string  `json:"subject"`
	Kind    string  `json:"kind"` // exam | practice
	Percent float64 `json:"percent"`
	Correct int     `json:"correct"`
	Total   int     `json:"total"`
	Date    string  `json:"date"`
}

func (s *Store) ListAttempts(ctx context.Context, tenantID, studentID string) ([]AttemptRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ps.id,
		        COALESCE(e.title, 'Practice · ' || COALESCE(sub.name,'')),
		        COALESCE(sub.name,''),
		        CASE WHEN ps.exam_id IS NOT NULL THEN 'exam' ELSE 'practice' END,
		        ps.percent,
		        COALESCE(jsonb_array_length(ps.snapshot),0),
		        (SELECT COUNT(*) FROM practice_answers pa WHERE pa.practice_set_id=ps.id AND pa.is_correct),
		        to_char(COALESCE(ps.finished_at, ps.created_at),'YYYY-MM-DD')
		 FROM practice_sets ps
		 LEFT JOIN exams e ON e.id = ps.exam_id
		 LEFT JOIN subjects sub ON sub.id = ps.subject_id
		 WHERE ps.tenant_id=$1 AND ps.student_id=$2 AND ps.status='finished'
		 ORDER BY COALESCE(ps.finished_at, ps.created_at) DESC`, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AttemptRow{}
	for rows.Next() {
		var r AttemptRow
		if err := rows.Scan(&r.ID, &r.Title, &r.Subject, &r.Kind, &r.Percent, &r.Total, &r.Correct, &r.Date); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ReviewItem is one question in an attempt review: what the student chose vs the key.
type ReviewItem struct {
	Question domain.Question `json:"question"`
	Selected string          `json:"selected"`
	Correct  bool            `json:"correct"`
}

type AttemptReview struct {
	ID      string       `json:"id"`
	Title   string       `json:"title"`
	Subject string       `json:"subject"`
	Percent float64      `json:"percent"`
	Items   []ReviewItem `json:"items"`
}

func (s *Store) GetAttemptReview(ctx context.Context, tenantID, setID string) (*AttemptReview, error) {
	ps, questions, err := s.GetPracticeSnapshot(ctx, tenantID, setID)
	if err != nil {
		return nil, err
	}
	rv := &AttemptReview{ID: ps.ID, Percent: ps.Percent, Items: []ReviewItem{}}
	_ = s.pool.QueryRow(ctx,
		`SELECT COALESCE(e.title, 'Practice · ' || COALESCE(sub.name,'')), COALESCE(sub.name,'')
		 FROM practice_sets ps
		 LEFT JOIN exams e ON e.id = ps.exam_id
		 LEFT JOIN subjects sub ON sub.id = ps.subject_id
		 WHERE ps.id=$1`, setID).Scan(&rv.Title, &rv.Subject)

	answers := map[string]struct {
		selected string
		correct  bool
	}{}
	arows, err := s.pool.Query(ctx,
		`SELECT question_id, selected, is_correct FROM practice_answers WHERE practice_set_id=$1`, setID)
	if err == nil {
		defer arows.Close()
		for arows.Next() {
			var qid, sel string
			var ok bool
			if arows.Scan(&qid, &sel, &ok) == nil {
				answers[qid] = struct {
					selected string
					correct  bool
				}{sel, ok}
			}
		}
	}
	for _, q := range questions {
		a := answers[q.ID]
		rv.Items = append(rv.Items, ReviewItem{Question: q, Selected: a.selected, Correct: a.correct})
	}
	return rv, nil
}

// SaveAttemptAnswers persists the student's per-question answers (for later review).
func (s *Store) SaveAttemptAnswers(ctx context.Context, setID string, details []map[string]any) {
	_, _ = s.pool.Exec(ctx, `DELETE FROM practice_answers WHERE practice_set_id=$1`, setID)
	for _, d := range details {
		qid, _ := d["question_id"].(string)
		sel, _ := d["selected"].(string)
		correct, _ := d["correct"].(bool)
		marks, _ := d["marks"].(float64)
		if qid == "" {
			continue
		}
		_, _ = s.pool.Exec(ctx,
			`INSERT INTO practice_answers (id, practice_set_id, question_id, selected, is_correct, marks)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
			domain.NewID(), setID, qid, sel, correct, marks)
	}
}

// StartPracticeAttempt builds an ungraded practice set from the question bank
// (exam_id NULL — it earns XP but is not counted in grades).
func (s *Store) StartPracticeAttempt(ctx context.Context, tenantID, studentID, subjectID, difficulty string, count int) (*domain.PracticeSet, []domain.Question, error) {
	if count <= 0 {
		count = 5
	}
	qs, err := s.ListQuestions(ctx, tenantID, subjectID, difficulty, count)
	if err != nil {
		return nil, nil, err
	}
	if len(qs) == 0 {
		return nil, nil, ErrNotFound
	}
	if len(qs) > count {
		qs = qs[:count]
	}
	ps := &domain.PracticeSet{ID: domain.NewID(), TenantID: tenantID, StudentID: studentID, SubjectID: subjectID}
	snap, _ := json.Marshal(qs)
	_, err = s.pool.Exec(ctx,
		`INSERT INTO practice_sets (id, tenant_id, student_id, subject_id, status, snapshot)
		 VALUES ($1,$2,$3,$4,'open',$5)`,
		ps.ID, ps.TenantID, ps.StudentID, ps.SubjectID, snap)
	if err != nil {
		return nil, nil, err
	}
	return ps, stripQuestions(qs), nil
}
