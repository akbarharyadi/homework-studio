package store

import (
	"context"

	"homework-studio/internal/domain"
)

// CreateMaterialFull inserts a teacher-uploaded material (starts as 'processing').
func (s *Store) CreateMaterialFull(ctx context.Context, m *domain.Material) error {
	if m.ID == "" {
		m.ID = domain.NewID()
	}
	if m.Status == "" {
		m.Status = domain.MaterialProcessing
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO materials (id, tenant_id, subject_id, title, source, uploaded_by, status, storage_key, source_filename, summary)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		m.ID, m.TenantID, m.SubjectID, m.Title, m.Source, m.UploadedBy, m.Status, m.StorageKey, m.SourceFilename, m.Summary)
	return err
}

func (s *Store) SetMaterialStatus(ctx context.Context, id, status string) {
	_, _ = s.pool.Exec(ctx, `UPDATE materials SET status=$2 WHERE id=$1`, id, status)
}

func (s *Store) SetMaterialSummary(ctx context.Context, id, summary string) {
	_, _ = s.pool.Exec(ctx, `UPDATE materials SET summary=$2 WHERE id=$1`, id, summary)
}

func (s *Store) GetMaterial(ctx context.Context, tenantID, id string) (*domain.Material, error) {
	m := &domain.Material{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, subject_id, title, source, COALESCE(uploaded_by,''), status, storage_key, source_filename, summary, created_at
		 FROM materials WHERE tenant_id=$1 AND id=$2`, tenantID, id).
		Scan(&m.ID, &m.TenantID, &m.SubjectID, &m.Title, &m.Source, &m.UploadedBy, &m.Status,
			&m.StorageKey, &m.SourceFilename, &m.Summary, &m.CreatedAt)
	if err != nil {
		return nil, noRows(err)
	}
	return m, nil
}

// MaterialRow is a list-view row: a material plus a pointer to the exam it produced.
type MaterialRow struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Subject    string `json:"subject"`
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at"`
	ExamID     string `json:"exam_id"`
	ExamStatus string `json:"exam_status"`
}

func (s *Store) ListMaterials(ctx context.Context, tenantID string) ([]MaterialRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT m.id, m.title, COALESCE(sub.name,''), m.status,
		        to_char(m.created_at,'YYYY-MM-DD'),
		        COALESCE(e.id,''), COALESCE(e.status,'')
		 FROM materials m
		 LEFT JOIN subjects sub ON sub.id = m.subject_id
		 LEFT JOIN exams e ON e.material_id = m.id
		 WHERE m.tenant_id=$1
		 ORDER BY m.created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MaterialRow{}
	for rows.Next() {
		var r MaterialRow
		if err := rows.Scan(&r.ID, &r.Title, &r.Subject, &r.Status, &r.CreatedAt, &r.ExamID, &r.ExamStatus); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
