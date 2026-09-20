package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/domain"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
)

// StudentGamification returns a student's XP / level / streak / badges.
func (h *Handler) StudentGamification(c *fiber.Ctx) error {
	tid := middleware.TenantID(c)
	sid := c.Params("id")
	if middleware.Role(c) == domain.RoleParent && !h.parentOwnsStudent(c, tid, sid) {
		return httpx.Forbidden(c, "not your student")
	}
	g, err := h.store.StudentGamification(c.Context(), tid, sid)
	if err != nil {
		return httpx.Internal(c, "could not load progress")
	}
	return httpx.OK(c, g)
}

// ListAttempts returns a student's finished attempts (exams + practice) for review.
func (h *Handler) ListAttempts(c *fiber.Ctx) error {
	rows, err := h.store.ListAttempts(c.Context(), middleware.TenantID(c), c.Params("id"))
	if err != nil {
		return httpx.Internal(c, "could not load results")
	}
	return httpx.OK(c, rows)
}

// AttemptReview returns one attempt with the student's answers vs the key.
func (h *Handler) AttemptReview(c *fiber.Ctx) error {
	rv, err := h.store.GetAttemptReview(c.Context(), middleware.TenantID(c), c.Params("id"))
	if err != nil {
		return httpx.NotFound(c, "attempt not found")
	}
	return httpx.OK(c, rv)
}

// GeneratePractice builds an ungraded practice set from the question bank.
func (h *Handler) GeneratePractice(c *fiber.Ctx) error {
	var req struct {
		StudentID  string `json:"student_id"`
		SubjectID  string `json:"subject_id"`
		Difficulty string `json:"difficulty"`
		Count      int    `json:"count"`
	}
	if err := c.BodyParser(&req); err != nil {
		return httpx.BadRequest(c, "invalid body")
	}
	if req.StudentID == "" || req.SubjectID == "" {
		return httpx.BadRequest(c, "student_id and subject_id are required")
	}
	ps, questions, err := h.store.StartPracticeAttempt(
		c.Context(), middleware.TenantID(c), req.StudentID, req.SubjectID, req.Difficulty, req.Count)
	if err != nil {
		return httpx.BadRequest(c, "no practice questions available for that subject yet")
	}
	return httpx.Created(c, fiber.Map{"practice_set_id": ps.ID, "questions": questions})
}

// Leaderboard ranks the class by XP.
func (h *Handler) Leaderboard(c *fiber.Ctx) error {
	rows, err := h.store.Leaderboard(c.Context(), middleware.TenantID(c), c.Query("student_id"))
	if err != nil {
		return httpx.Internal(c, "could not load leaderboard")
	}
	return httpx.OK(c, rows)
}
