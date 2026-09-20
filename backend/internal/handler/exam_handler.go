package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
	"homework-studio/internal/store"
)

// ListExams returns the teacher's generated exams (optionally by status).
func (h *Handler) ListExams(c *fiber.Ctx) error {
	rows, err := h.store.ListExams(c.Context(), middleware.TenantID(c), c.Query("status"))
	if err != nil {
		return httpx.Internal(c, "could not list exams")
	}
	return httpx.OK(c, rows)
}

// GetExam returns one exam with its questions (answers included — teacher review view).
func (h *Handler) GetExam(c *fiber.Ctx) error {
	exam, questions, err := h.store.GetExam(c.Context(), middleware.TenantID(c), c.Params("id"))
	if err != nil {
		return httpx.NotFound(c, "exam not found")
	}
	return httpx.OK(c, fiber.Map{"exam": exam, "questions": questions})
}

// PublishExam approves the remaining questions and publishes the exam to students.
func (h *Handler) PublishExam(c *fiber.Ctx) error {
	if err := h.store.PublishExam(c.Context(), middleware.TenantID(c), c.Params("id")); err != nil {
		return httpx.NotFound(c, "exam not found")
	}
	return httpx.OK(c, fiber.Map{"status": "published"})
}

// DiscardExamQuestion drops one AI-generated question the teacher rejected.
func (h *Handler) DiscardExamQuestion(c *fiber.Ctx) error {
	err := h.store.DiscardExamQuestion(c.Context(), middleware.TenantID(c), c.Params("id"), c.Params("qid"))
	if err != nil {
		return httpx.NotFound(c, "question not found")
	}
	return httpx.OK(c, fiber.Map{"status": "discarded"})
}

// ListPublishedExams returns the exams a student can take.
func (h *Handler) ListPublishedExams(c *fiber.Ctx) error {
	rows, err := h.store.ListPublishedExams(c.Context(), middleware.TenantID(c))
	if err != nil {
		return httpx.Internal(c, "could not list exams")
	}
	return httpx.OK(c, rows)
}

// StartExam snapshots a published exam into a new attempt for the student.
func (h *Handler) StartExam(c *fiber.Ctx) error {
	var body struct {
		StudentID string `json:"student_id"`
	}
	_ = c.BodyParser(&body)
	if body.StudentID == "" {
		return httpx.BadRequest(c, "student_id is required")
	}
	ps, questions, err := h.store.StartExamAttempt(c.Context(), middleware.TenantID(c), body.StudentID, c.Params("id"))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return httpx.NotFound(c, "exam not available")
		}
		return httpx.Internal(c, "could not start exam")
	}
	return httpx.Created(c, fiber.Map{"practice_set_id": ps.ID, "questions": questions})
}
