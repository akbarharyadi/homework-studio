package store

import (
	"context"

	"homework-studio/internal/domain"
)

// --- Tenants ---

func (s *Store) CreateTenant(ctx context.Context, t *domain.Tenant) error {
	if t.ID == "" {
		t.ID = domain.NewID()
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO tenants (id, name, slug, confidence_threshold) VALUES ($1,$2,$3,$4)`,
		t.ID, t.Name, t.Slug, t.ConfidenceThreshold)
	return err
}

func (s *Store) GetTenant(ctx context.Context, id string) (*domain.Tenant, error) {
	t := &domain.Tenant{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, slug, confidence_threshold, created_at FROM tenants WHERE id=$1`, id).
		Scan(&t.ID, &t.Name, &t.Slug, &t.ConfidenceThreshold, &t.CreatedAt)
	if err != nil {
		return nil, noRows(err)
	}
	return t, nil
}

// --- Users ---

func (s *Store) CreateUser(ctx context.Context, u *domain.User) error {
	if u.ID == "" {
		u.ID = domain.NewID()
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO users (id, tenant_id, email, password_hash, name, role)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		u.ID, u.TenantID, u.Email, u.PasswordHash, u.Name, u.Role)
	return err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	u := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, password_hash, name, role, created_at
		 FROM users WHERE lower(email)=lower($1) LIMIT 1`, email).
		Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, noRows(err)
	}
	return u, nil
}

func (s *Store) GetUser(ctx context.Context, id string) (*domain.User, error) {
	u := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, password_hash, name, role, created_at
		 FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, noRows(err)
	}
	return u, nil
}

// --- Subjects ---

func (s *Store) CreateSubject(ctx context.Context, sub *domain.Subject) error {
	if sub.ID == "" {
		sub.ID = domain.NewID()
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO subjects (id, tenant_id, name, color) VALUES ($1,$2,$3,$4)`,
		sub.ID, sub.TenantID, sub.Name, sub.Color)
	return err
}

func (s *Store) ListSubjects(ctx context.Context, tenantID string) ([]domain.Subject, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, name, color FROM subjects WHERE tenant_id=$1 ORDER BY name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Subject{}
	for rows.Next() {
		var sub domain.Subject
		if err := rows.Scan(&sub.ID, &sub.TenantID, &sub.Name, &sub.Color); err != nil {
			return nil, err
		}
		out = append(out, sub)
	}
	return out, rows.Err()
}

// SubjectByName returns a subject by (tenant, case-insensitive name), or ErrNotFound.
func (s *Store) SubjectByName(ctx context.Context, tenantID, name string) (*domain.Subject, error) {
	sub := &domain.Subject{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, color FROM subjects
		 WHERE tenant_id=$1 AND lower(name)=lower($2) LIMIT 1`, tenantID, name).
		Scan(&sub.ID, &sub.TenantID, &sub.Name, &sub.Color)
	if err != nil {
		return nil, noRows(err)
	}
	return sub, nil
}

// GetSubjectByID returns a subject by id, or ErrNotFound.
func (s *Store) GetSubjectByID(ctx context.Context, id string) (*domain.Subject, error) {
	sub := &domain.Subject{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, color FROM subjects WHERE id=$1`, id).
		Scan(&sub.ID, &sub.TenantID, &sub.Name, &sub.Color)
	if err != nil {
		return nil, noRows(err)
	}
	return sub, nil
}

// --- Students ---

func (s *Store) CreateStudent(ctx context.Context, st *domain.Student) error {
	if st.ID == "" {
		st.ID = domain.NewID()
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO students (id, tenant_id, name, grade_level, parent_user_id)
		 VALUES ($1,$2,$3,$4,$5)`,
		st.ID, st.TenantID, st.Name, st.GradeLevel, st.ParentUserID)
	return err
}

func (s *Store) GetStudent(ctx context.Context, tenantID, id string) (*domain.Student, error) {
	st := &domain.Student{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, grade_level, parent_user_id
		 FROM students WHERE tenant_id=$1 AND id=$2`, tenantID, id).
		Scan(&st.ID, &st.TenantID, &st.Name, &st.GradeLevel, &st.ParentUserID)
	if err != nil {
		return nil, noRows(err)
	}
	return st, nil
}

func (s *Store) ListStudents(ctx context.Context, tenantID string) ([]domain.Student, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, name, grade_level, parent_user_id
		 FROM students WHERE tenant_id=$1 ORDER BY name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStudents(rows)
}

// ListStudentsForParent returns only the children linked to a parent user.
func (s *Store) ListStudentsForParent(ctx context.Context, tenantID, parentUserID string) ([]domain.Student, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, name, grade_level, parent_user_id
		 FROM students WHERE tenant_id=$1 AND parent_user_id=$2 ORDER BY name`, tenantID, parentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStudents(rows)
}

func scanStudents(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}) ([]domain.Student, error) {
	out := []domain.Student{}
	for rows.Next() {
		var st domain.Student
		if err := rows.Scan(&st.ID, &st.TenantID, &st.Name, &st.GradeLevel, &st.ParentUserID); err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, rows.Err()
}
