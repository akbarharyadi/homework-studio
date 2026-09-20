// Package domain holds the core entities and enums for Homework Studio.
package domain

import "time"

// Roles.
const (
	RoleAdmin   = "admin"
	RoleTeacher = "teacher"
	RoleParent  = "parent"
	RoleStudent = "student"
)

// Homework lifecycle statuses.
const (
	HWPending     = "pending"
	HWProcessing  = "processing"
	HWNeedsReview = "needs_review"
	HWGraded      = "graded"
	HWFailed      = "failed"
)

// Review task statuses.
const (
	ReviewOpen     = "open"
	ReviewResolved = "resolved"
)

// Difficulty levels.
const (
	DiffEasy   = "easy"
	DiffMedium = "medium"
	DiffHard   = "hard"
)

type Tenant struct {
	ID                  string    `json:"id"`
	Name                string    `json:"name"`
	Slug                string    `json:"slug"`
	ConfidenceThreshold *float64  `json:"confidence_threshold,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

type User struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Subject struct {
	ID       string `json:"id"`
	TenantID string `json:"tenant_id"`
	Name     string `json:"name"`
	Color    string `json:"color"`
}

type Student struct {
	ID           string  `json:"id"`
	TenantID     string  `json:"tenant_id"`
	Name         string  `json:"name"`
	GradeLevel   string  `json:"grade_level"`
	ParentUserID *string `json:"parent_user_id,omitempty"`
}

// Homework is one ingested worksheet / answer sheet.
type Homework struct {
	ID             string     `json:"id"`
	TenantID       string     `json:"tenant_id"`
	StudentID      string     `json:"student_id"`
	SubjectID      *string    `json:"subject_id,omitempty"`
	Title          string     `json:"title"`
	Status         string     `json:"status"`
	SourceFilename string     `json:"source_filename"`
	StorageKey     string     `json:"storage_key"`
	UploadedBy     string     `json:"uploaded_by"`
	DetectedSubject string    `json:"detected_subject"`
	Score          float64    `json:"score"`
	MaxScore       float64    `json:"max_score"`
	Percent        float64    `json:"percent"`
	Confidence     float64    `json:"confidence"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// HomeworkItem is one extracted question/answer with its confidence.
type HomeworkItem struct {
	ID            string   `json:"id"`
	HomeworkID    string   `json:"homework_id"`
	QuestionNo    int      `json:"question_no"`
	QuestionText  string   `json:"question_text"`
	StudentAnswer string   `json:"student_answer"`
	CorrectAnswer string   `json:"correct_answer"`
	IsCorrect     *bool    `json:"is_correct,omitempty"`
	Marks         float64  `json:"marks"`
	MaxMarks      float64  `json:"max_marks"`
	Confidence    float64  `json:"confidence"`
	NeedsReview   bool     `json:"needs_review"`
}

type ReviewTask struct {
	ID         string     `json:"id"`
	TenantID   string     `json:"tenant_id"`
	HomeworkID string     `json:"homework_id"`
	ItemID     *string    `json:"item_id,omitempty"`
	FieldName  string     `json:"field_name"`
	Reason     string     `json:"reason"`
	Status     string     `json:"status"`
	Resolution string     `json:"resolution"`
	ResolvedBy *string    `json:"resolved_by,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty"`
}

type Question struct {
	ID           string   `json:"id"`
	TenantID     string   `json:"tenant_id"`
	SubjectID    string   `json:"subject_id"`
	Topic        string   `json:"topic"`
	Difficulty   string   `json:"difficulty"`
	Stem         string   `json:"stem"`
	Options      []string `json:"options"`
	Answer       string   `json:"answer,omitempty"`
	Explanation  string   `json:"explanation,omitempty"`
	Marks        float64  `json:"marks"`
	NegativeMarks float64 `json:"negative_marks"`
	AIGenerated  bool     `json:"ai_generated"`
}

type PracticeSet struct {
	ID         string     `json:"id"`
	TenantID   string     `json:"tenant_id"`
	StudentID  string     `json:"student_id"`
	SubjectID  string     `json:"subject_id"`
	Status     string     `json:"status"`
	Score      float64    `json:"score"`
	Percent    float64    `json:"percent"`
	CreatedAt  time.Time  `json:"created_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}
