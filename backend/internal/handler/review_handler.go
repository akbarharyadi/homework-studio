package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
)

// ListReviewTasks returns the teacher review queue (open by default).
func (h *Handler) ListReviewTasks(c *fiber.Ctx) error {
	status := c.Query("status", "open")
	tasks, err := h.store.ListReviewTasks(c.Context(), middleware.TenantID(c), status)
	if err != nil {
		return httpx.Internal(c, "could not list review tasks")
	}
	return httpx.OK(c, tasks)
}

type resolveRequest struct {
	CorrectedAnswer string `json:"corrected_answer"`
	IsCorrect       bool   `json:"is_correct"`
}

// ResolveReviewTask applies a teacher's correction and re-grades the homework.
func (h *Handler) ResolveReviewTask(c *fiber.Ctx) error {
	var req resolveRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.BadRequest(c, "invalid body")
	}
	homeworkID, err := h.store.ResolveReview(
		c.Context(), middleware.TenantID(c), c.Params("id"),
		middleware.UserID(c), req.CorrectedAnswer, req.IsCorrect,
	)
	if err != nil {
		return httpx.BadRequest(c, "could not resolve task: "+err.Error())
	}
	hw, _ := h.store.GetHomework(c.Context(), middleware.TenantID(c), homeworkID)
	return httpx.OK(c, fiber.Map{"homework": hw})
}
