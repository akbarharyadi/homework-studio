package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/domain"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
)

// LatestStudentReport returns the most recent auto-generated report for a
// student (produced by the background scheduler).
func (h *Handler) LatestStudentReport(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	studentID := c.Params("id")
	if middleware.Role(c) == domain.RoleParent && !h.parentOwnsStudent(c, tenantID, studentID) {
		return httpx.Forbidden(c, "not your student")
	}
	r, err := h.store.GetLatestStudentReport(c.Context(), tenantID, studentID)
	if err != nil {
		return httpx.NotFound(c, "no report generated yet")
	}
	return httpx.OK(c, r)
}
