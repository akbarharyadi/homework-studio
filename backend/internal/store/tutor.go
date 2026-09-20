package store

import (
	"context"
	"encoding/json"
	"time"

	"homework-studio/internal/domain"
)

// --- Questions (practice bank) ---

func (s *Store) CreateQuestion(ctx context.Context, q *domain.Question) error {
	if q.ID == "" {
		q.ID = domain.NewID()
	}
	opts, _ := json.Marshal(q.Options)
	conf, approved := q.Confidence, q.Approved
	if q.ExamID == nil { // bank / ad-hoc question: always trusted
		if conf == 0 {
			conf = 1
		}
		approved = true
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO questions (id, tenant_id, subject_id, topic, difficulty, stem, options,
		    answer, explanation, marks, negative_marks, ai_generated, exam_id, confidence, needs_review, approved)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		q.ID, q.TenantID, q.SubjectID, q.Topic, q.Difficulty, q.Stem, opts,
		q.Answer, q.Explanation, q.Marks, q.NegativeMarks, q.AIGenerated,
		q.ExamID, conf, q.NeedsReview, approved)
	return err
}

func (s *Store) GetQuestion(ctx context.Context, id string) (*domain.Question, error) {
	q := &domain.Question{}
	var opts []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, subject_id, topic, difficulty, stem, options, answer,
		    explanation, marks, negative_marks, ai_generated, exam_id, confidence, needs_review, approved
		 FROM questions WHERE id=$1`, id).
		Scan(&q.ID, &q.TenantID, &q.SubjectID, &q.Topic, &q.Difficulty, &q.Stem, &opts,
			&q.Answer, &q.Explanation, &q.Marks, &q.NegativeMarks, &q.AIGenerated,
			&q.ExamID, &q.Confidence, &q.NeedsReview, &q.Approved)
	if err != nil {
		return nil, noRows(err)
	}
	_ = json.Unmarshal(opts, &q.Options)
	return q, nil
}

// ListQuestions returns bank questions for a subject, optionally by difficulty.
func (s *Store) ListQuestions(ctx context.Context, tenantID, subjectID, difficulty string, limit int) ([]domain.Question, error) {
	if limit <= 0 {
		limit = 50
	}
	q := `SELECT id, tenant_id, subject_id, topic, difficulty, stem, options, answer,
	         explanation, marks, negative_marks, ai_generated
	      FROM questions WHERE tenant_id=$1 AND subject_id=$2 AND exam_id IS NULL`
	args := []any{tenantID, subjectID}
	if difficulty != "" {
		args = append(args, difficulty)
		q += " AND difficulty=$3"
	}
	q += " ORDER BY random() LIMIT " + itoa(limit)
	rows, err := s.pool.Query(ctx, q, args...)
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
			&qq.AIGenerated); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(opts, &qq.Options)
		out = append(out, qq)
	}
	return out, rows.Err()
}

// --- Practice sets ---

// CreatePracticeSet freezes a snapshot of the chosen questions (answers included
// server-side for grading resumability, stripped before sending to the client).
func (s *Store) CreatePracticeSet(ctx context.Context, ps *domain.PracticeSet, questions []domain.Question) error {
	if ps.ID == "" {
		ps.ID = domain.NewID()
	}
	snap, _ := json.Marshal(questions)
	_, err := s.pool.Exec(ctx,
		`INSERT INTO practice_sets (id, tenant_id, student_id, subject_id, status, snapshot)
		 VALUES ($1,$2,$3,$4,'open',$5)`,
		ps.ID, ps.TenantID, ps.StudentID, ps.SubjectID, snap)
	return err
}

func (s *Store) GetPracticeSnapshot(ctx context.Context, tenantID, setID string) (*domain.PracticeSet, []domain.Question, error) {
	ps := &domain.PracticeSet{}
	var snap []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, student_id, subject_id, status, score, percent, snapshot, created_at, finished_at
		 FROM practice_sets WHERE tenant_id=$1 AND id=$2`, tenantID, setID).
		Scan(&ps.ID, &ps.TenantID, &ps.StudentID, &ps.SubjectID, &ps.Status, &ps.Score,
			&ps.Percent, &snap, &ps.CreatedAt, &ps.FinishedAt)
	if err != nil {
		return nil, nil, noRows(err)
	}
	var qs []domain.Question
	_ = json.Unmarshal(snap, &qs)
	return ps, qs, nil
}

// FinishPractice grades the submitted answers against the frozen snapshot and
// records the score. Grading mirrors ai-cbt: correct→marks, wrong→−negative.
func (s *Store) FinishPractice(ctx context.Context, ps *domain.PracticeSet, score, percent float64) error {
	now := time.Now()
	_, err := s.pool.Exec(ctx,
		`UPDATE practice_sets SET status='finished', score=$2, percent=$3, finished_at=$4 WHERE id=$1`,
		ps.ID, score, percent, now)
	return err
}

// --- RAG material chunks ---

func (s *Store) CreateMaterial(ctx context.Context, tenantID, subjectID, title, source string) (string, error) {
	id := domain.NewID()
	_, err := s.pool.Exec(ctx,
		`INSERT INTO materials (id, tenant_id, subject_id, title, source) VALUES ($1,$2,$3,$4,$5)`,
		id, tenantID, subjectID, title, source)
	return id, err
}

func (s *Store) CreateChunk(ctx context.Context, materialID, content string, embedding []float64, page int) error {
	emb, _ := json.Marshal(embedding)
	_, err := s.pool.Exec(ctx,
		`INSERT INTO material_chunks (id, material_id, content, embedding, page) VALUES ($1,$2,$3,$4,$5)`,
		domain.NewID(), materialID, content, emb, page)
	return err
}

// Chunk is a retrieved passage plus its embedding for in-Go cosine ranking.
type Chunk struct {
	Content   string    `json:"content"`
	Page      int       `json:"page"`
	Embedding []float64 `json:"-"`
}

// ChunksForSubject returns all chunks under a subject (small demo corpus, ranked
// in Go; swap to pgvector's <=> operator at scale).
func (s *Store) ChunksForSubject(ctx context.Context, tenantID, subjectID string) ([]Chunk, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.content, c.page, c.embedding
		 FROM material_chunks c
		 JOIN materials m ON m.id = c.material_id
		 WHERE m.tenant_id=$1 AND m.subject_id=$2`, tenantID, subjectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Chunk{}
	for rows.Next() {
		var ch Chunk
		var emb []byte
		if err := rows.Scan(&ch.Content, &ch.Page, &emb); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(emb, &ch.Embedding)
		out = append(out, ch)
	}
	return out, rows.Err()
}

// --- Chat + usage ---

func (s *Store) CreateChatSession(ctx context.Context, tenantID, studentID string, subjectID *string) (string, error) {
	id := domain.NewID()
	_, err := s.pool.Exec(ctx,
		`INSERT INTO chat_sessions (id, tenant_id, student_id, subject_id) VALUES ($1,$2,$3,$4)`,
		id, tenantID, studentID, subjectID)
	return id, err
}

func (s *Store) AddChatMessage(ctx context.Context, sessionID, role, content string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO chat_messages (id, session_id, role, content) VALUES ($1,$2,$3,$4)`,
		domain.NewID(), sessionID, role, content)
	return err
}

func (s *Store) LogAIUsage(ctx context.Context, tenantID string, studentID *string, feature string, prompt, completion int, model string) {
	_, _ = s.pool.Exec(ctx,
		`INSERT INTO ai_usage (id, tenant_id, student_id, feature, prompt_tokens, completion_tokens, model)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		domain.NewID(), tenantID, studentID, feature, prompt, completion, model)
}
