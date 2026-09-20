package store

import (
	"context"

	"homework-studio/internal/domain"
)

// ReviewTaskView joins a task with a little context for the queue UI.
type ReviewTaskView struct {
	domain.ReviewTask
	StudentName   string  `json:"student_name"`
	HomeworkTitle string  `json:"homework_title"`
	QuestionNo    int     `json:"question_no"`
	QuestionText  string  `json:"question_text"`
	StudentAnswer string  `json:"student_answer"`
	CorrectAnswer string  `json:"correct_answer"`
	Confidence    float64 `json:"confidence"`
}

func (s *Store) ListReviewTasks(ctx context.Context, tenantID, status string) ([]ReviewTaskView, error) {
	if status == "" {
		status = domain.ReviewOpen
	}
	rows, err := s.pool.Query(ctx,
		`SELECT r.id, r.tenant_id, r.homework_id, r.item_id, r.field_name, r.reason,
		        r.status, r.resolution, r.resolved_by, r.created_at, r.resolved_at,
		        s.name, h.title,
		        COALESCE(i.question_no,0), COALESCE(i.question_text,''),
		        COALESCE(i.student_answer,''), COALESCE(i.correct_answer,''), COALESCE(i.confidence,0)
		 FROM review_tasks r
		 JOIN homeworks h ON h.id = r.homework_id
		 JOIN students  s ON s.id = h.student_id
		 LEFT JOIN homework_items i ON i.id = r.item_id
		 WHERE r.tenant_id=$1 AND r.status=$2
		 ORDER BY r.created_at ASC`, tenantID, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ReviewTaskView{}
	for rows.Next() {
		var v ReviewTaskView
		if err := rows.Scan(&v.ID, &v.TenantID, &v.HomeworkID, &v.ItemID, &v.FieldName, &v.Reason,
			&v.Status, &v.Resolution, &v.ResolvedBy, &v.CreatedAt, &v.ResolvedAt,
			&v.StudentName, &v.HomeworkTitle, &v.QuestionNo, &v.QuestionText,
			&v.StudentAnswer, &v.CorrectAnswer, &v.Confidence); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

// ResolveReview applies a teacher's correction to the item, closes the task, and
// re-grades the homework. When no open tasks remain, the homework becomes graded.
// Returns the homework id so the caller can refresh it.
func (s *Store) ResolveReview(
	ctx context.Context, tenantID, taskID, resolverID, correctedAnswer string, isCorrect bool,
) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var homeworkID string
	var itemID *string
	if err = tx.QueryRow(ctx,
		`SELECT homework_id, item_id FROM review_tasks WHERE id=$1 AND tenant_id=$2 AND status='open'`,
		taskID, tenantID).Scan(&homeworkID, &itemID); err != nil {
		return "", noRows(err)
	}

	// Apply the correction to the item: teacher confirms the answer, sets
	// correctness, marks full confidence, clears the review flag.
	if itemID != nil {
		if _, err = tx.Exec(ctx,
			`UPDATE homework_items
			 SET student_answer=CASE WHEN $2 <> '' THEN $2 ELSE student_answer END,
			     is_correct=$3,
			     marks=CASE WHEN $3 THEN max_marks ELSE 0 END,
			     confidence=1.0, needs_review=false
			 WHERE id=$1`, *itemID, correctedAnswer, isCorrect); err != nil {
			return "", err
		}
	}

	if _, err = tx.Exec(ctx,
		`UPDATE review_tasks SET status='resolved', resolution=$2, resolved_by=$3, resolved_at=now()
		 WHERE id=$1`, taskID, correctedAnswer, resolverID); err != nil {
		return "", err
	}

	// Re-aggregate homework score from items.
	if _, err = tx.Exec(ctx,
		`UPDATE homeworks h SET
		    score = sub.score, max_score = sub.max_score,
		    percent = CASE WHEN sub.max_score > 0 THEN sub.score/sub.max_score*100 ELSE 0 END,
		    updated_at = now()
		 FROM (SELECT COALESCE(SUM(marks),0) AS score, COALESCE(SUM(max_marks),0) AS max_score
		       FROM homework_items WHERE homework_id=$1) sub
		 WHERE h.id=$1`, homeworkID); err != nil {
		return "", err
	}

	// If no open tasks remain, mark graded.
	var remaining int
	if err = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM review_tasks WHERE homework_id=$1 AND status='open'`, homeworkID).
		Scan(&remaining); err != nil {
		return "", err
	}
	if remaining == 0 {
		if _, err = tx.Exec(ctx,
			`UPDATE homeworks SET status='graded', updated_at=now() WHERE id=$1`, homeworkID); err != nil {
			return "", err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return "", err
	}
	return homeworkID, nil
}
