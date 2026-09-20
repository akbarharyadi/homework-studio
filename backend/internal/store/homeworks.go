package store

import (
	"context"

	"homework-studio/internal/domain"
)

// CreateHomework inserts the initial pending row (before processing).
func (s *Store) CreateHomework(ctx context.Context, hw *domain.Homework) error {
	if hw.ID == "" {
		hw.ID = domain.NewID()
	}
	if hw.Status == "" {
		hw.Status = domain.HWPending
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO homeworks (id, tenant_id, student_id, subject_id, title, status,
		    source_filename, storage_key, uploaded_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		hw.ID, hw.TenantID, hw.StudentID, hw.SubjectID, hw.Title, hw.Status,
		hw.SourceFilename, hw.StorageKey, hw.UploadedBy)
	return err
}

func (s *Store) SetHomeworkStatus(ctx context.Context, id, status string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE homeworks SET status=$2, updated_at=now() WHERE id=$1`, id, status)
	return err
}

// SaveExtraction persists a processed homework atomically: the graded items,
// any review tasks the confidence gate opened, and the homework aggregate.
func (s *Store) SaveExtraction(
	ctx context.Context,
	hw *domain.Homework,
	items []domain.HomeworkItem,
	tasks []domain.ReviewTask,
) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	// Replace any previous items for idempotency.
	if _, err = tx.Exec(ctx, `DELETE FROM homework_items WHERE homework_id=$1`, hw.ID); err != nil {
		return err
	}
	for i := range items {
		it := &items[i]
		if it.ID == "" {
			it.ID = domain.NewID()
		}
		it.HomeworkID = hw.ID
		if _, err = tx.Exec(ctx,
			`INSERT INTO homework_items (id, homework_id, question_no, question_text,
			    student_answer, correct_answer, is_correct, marks, max_marks, confidence, needs_review)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			it.ID, it.HomeworkID, it.QuestionNo, it.QuestionText, it.StudentAnswer,
			it.CorrectAnswer, it.IsCorrect, it.Marks, it.MaxMarks, it.Confidence, it.NeedsReview,
		); err != nil {
			return err
		}
	}

	for i := range tasks {
		t := &tasks[i]
		if t.ID == "" {
			t.ID = domain.NewID()
		}
		t.HomeworkID = hw.ID
		t.TenantID = hw.TenantID
		if _, err = tx.Exec(ctx,
			`INSERT INTO review_tasks (id, tenant_id, homework_id, item_id, field_name, reason, status)
			 VALUES ($1,$2,$3,$4,$5,$6,'open')`,
			t.ID, t.TenantID, t.HomeworkID, t.ItemID, t.FieldName, t.Reason,
		); err != nil {
			return err
		}
	}

	if _, err = tx.Exec(ctx,
		`UPDATE homeworks SET status=$2, subject_id=$3, detected_subject=$4,
		    score=$5, max_score=$6, percent=$7, confidence=$8, updated_at=now()
		 WHERE id=$1`,
		hw.ID, hw.Status, hw.SubjectID, hw.DetectedSubject,
		hw.Score, hw.MaxScore, hw.Percent, hw.Confidence,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Store) GetHomework(ctx context.Context, tenantID, id string) (*domain.Homework, error) {
	hw := &domain.Homework{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, student_id, subject_id, title, status, source_filename,
		    storage_key, uploaded_by, detected_subject, score, max_score, percent, confidence,
		    created_at, updated_at
		 FROM homeworks WHERE tenant_id=$1 AND id=$2`, tenantID, id).
		Scan(&hw.ID, &hw.TenantID, &hw.StudentID, &hw.SubjectID, &hw.Title, &hw.Status,
			&hw.SourceFilename, &hw.StorageKey, &hw.UploadedBy, &hw.DetectedSubject,
			&hw.Score, &hw.MaxScore, &hw.Percent, &hw.Confidence, &hw.CreatedAt, &hw.UpdatedAt)
	if err != nil {
		return nil, noRows(err)
	}
	return hw, nil
}

func (s *Store) GetHomeworkItems(ctx context.Context, homeworkID string) ([]domain.HomeworkItem, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, homework_id, question_no, question_text, student_answer, correct_answer,
		    is_correct, marks, max_marks, confidence, needs_review
		 FROM homework_items WHERE homework_id=$1 ORDER BY question_no`, homeworkID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.HomeworkItem{}
	for rows.Next() {
		var it domain.HomeworkItem
		if err := rows.Scan(&it.ID, &it.HomeworkID, &it.QuestionNo, &it.QuestionText,
			&it.StudentAnswer, &it.CorrectAnswer, &it.IsCorrect, &it.Marks, &it.MaxMarks,
			&it.Confidence, &it.NeedsReview); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// HomeworkFilter narrows a listing.
type HomeworkFilter struct {
	StudentID string
	Status    string
}

func (s *Store) ListHomeworks(ctx context.Context, tenantID string, f HomeworkFilter) ([]domain.Homework, error) {
	q := `SELECT id, tenant_id, student_id, subject_id, title, status, source_filename,
	         storage_key, uploaded_by, detected_subject, score, max_score, percent, confidence,
	         created_at, updated_at
	      FROM homeworks WHERE tenant_id=$1`
	args := []any{tenantID}
	if f.StudentID != "" {
		args = append(args, f.StudentID)
		q += " AND student_id=$2"
	}
	if f.Status != "" {
		args = append(args, f.Status)
		q += " AND status=$" + itoa(len(args))
	}
	q += " ORDER BY created_at DESC LIMIT 200"

	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Homework{}
	for rows.Next() {
		var hw domain.Homework
		if err := rows.Scan(&hw.ID, &hw.TenantID, &hw.StudentID, &hw.SubjectID, &hw.Title,
			&hw.Status, &hw.SourceFilename, &hw.StorageKey, &hw.UploadedBy, &hw.DetectedSubject,
			&hw.Score, &hw.MaxScore, &hw.Percent, &hw.Confidence, &hw.CreatedAt, &hw.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, hw)
	}
	return out, rows.Err()
}
