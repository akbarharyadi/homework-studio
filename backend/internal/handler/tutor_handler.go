package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
)

// ExplainQuestion returns a step-by-step explanation for a bank question.
func (h *Handler) ExplainQuestion(c *fiber.Ctx) error {
	questionID := c.Params("id")
	text, err := h.tutor.Explain(c.Context(), middleware.TenantID(c), nil, questionID)
	if err != nil {
		return httpx.NotFound(c, "question not found")
	}
	return httpx.OK(c, fiber.Map{"explanation": text})
}

type submitRequest struct {
	Answers map[string]string `json:"answers"`
}

// SubmitPractice grades a practice set against its frozen snapshot.
func (h *Handler) SubmitPractice(c *fiber.Ctx) error {
	var req submitRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.BadRequest(c, "invalid body")
	}
	result, err := h.tutor.SubmitPractice(c.Context(), middleware.TenantID(c), c.Params("id"), req.Answers)
	if err != nil {
		return httpx.BadRequest(c, "could not grade: "+err.Error())
	}
	return httpx.OK(c, result)
}

type chatRequest struct {
	StudentID string `json:"student_id"`
	SubjectID string `json:"subject_id"`
	Message   string `json:"message"`
}

// TutorChat answers a student's question, grounded in subject material.
func (h *Handler) TutorChat(c *fiber.Ctx) error {
	var req chatRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.BadRequest(c, "invalid body")
	}
	if req.Message == "" {
		return httpx.BadRequest(c, "message is required")
	}
	answer, err := h.tutor.Chat(c.Context(), middleware.TenantID(c), req.StudentID, req.SubjectID, req.Message)
	if err != nil {
		return httpx.Internal(c, "tutor error")
	}
	return httpx.OK(c, fiber.Map{"answer": answer})
}
