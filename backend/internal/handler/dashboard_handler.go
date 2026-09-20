package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/domain"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
)

// ListSubjects returns the tenant's subjects.
func (h *Handler) ListSubjects(c *fiber.Ctx) error {
	subs, err := h.store.ListSubjects(c.Context(), middleware.TenantID(c))
	if err != nil {
		return httpx.Internal(c, "could not list subjects")
	}
	return httpx.OK(c, subs)
}

// ListStudents returns all students (teacher/admin) or the caller's children (parent).
func (h *Handler) ListStudents(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	if middleware.Role(c) == domain.RoleParent {
		kids, err := h.store.ListStudentsForParent(c.Context(), tenantID, middleware.UserID(c))
		if err != nil {
			return httpx.Internal(c, "could not list students")
		}
		return httpx.OK(c, kids)
	}
	students, err := h.store.ListStudents(c.Context(), tenantID)
	if err != nil {
		return httpx.Internal(c, "could not list students")
	}
	return httpx.OK(c, students)
}

// ClassStats is the teacher dashboard summary.
func (h *Handler) ClassStats(c *fiber.Ctx) error {
	stats, err := h.store.ClassStats(c.Context(), middleware.TenantID(c))
	if err != nil {
		return httpx.Internal(c, "could not compute stats")
	}
	return httpx.OK(c, stats)
}

// StudentProgress is the parent/teacher view of one child's progress.
func (h *Handler) StudentProgress(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	studentID := c.Params("id")
	if middleware.Role(c) == domain.RoleParent && !h.parentOwnsStudent(c, tenantID, studentID) {
		return httpx.Forbidden(c, "not your student")
	}
	progress, err := h.store.StudentProgress(c.Context(), tenantID, studentID)
	if err != nil {
		return httpx.NotFound(c, "student not found")
	}
	return httpx.OK(c, progress)
}
