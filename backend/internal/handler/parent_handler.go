package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/domain"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
	"homework-studio/internal/store"
)

// FamilyDashboard returns a summary card (grades + engagement) per child.
func (h *Handler) FamilyDashboard(c *fiber.Ctx) error {
	rows, err := h.store.Family(c.Context(), middleware.TenantID(c), middleware.UserID(c))
	if err != nil {
		return httpx.Internal(c, "could not load your children")
	}
	return httpx.OK(c, rows)
}

// FamilyActivity returns the parent "what's new" feed.
func (h *Handler) FamilyActivity(c *fiber.Ctx) error {
	items, err := h.store.FamilyActivity(c.Context(), middleware.TenantID(c), middleware.UserID(c))
	if err != nil {
		return httpx.Internal(c, "could not load activity")
	}
	return httpx.OK(c, items)
}

// CompareToClass returns a child's subject averages vs the class average.
func (h *Handler) CompareToClass(c *fiber.Ctx) error {
	tid := middleware.TenantID(c)
	sid := c.Params("id")
	if middleware.Role(c) == domain.RoleParent && !h.parentOwnsStudent(c, tid, sid) {
		return httpx.Forbidden(c, "not your student")
	}
	out, err := h.store.CompareToClass(c.Context(), tid, sid)
	if err != nil {
		return httpx.Internal(c, "could not compare")
	}
	return httpx.OK(c, out)
}

// ParentTip returns a short, warm "how to help at home" suggestion for a child.
func (h *Handler) ParentTip(c *fiber.Ctx) error {
	tid := middleware.TenantID(c)
	sid := c.Params("id")
	if middleware.Role(c) == domain.RoleParent && !h.parentOwnsStudent(c, tid, sid) {
		return httpx.Forbidden(c, "not your student")
	}
	prog, err := h.store.StudentProgress(c.Context(), tid, sid)
	if err != nil {
		return httpx.NotFound(c, "student not found")
	}
	best, worst, has := bestWorst(prog.SubjectAverages)
	tip := h.tutor.GenerateParentTip(c.Context(), tid, firstWord(prog.StudentName),
		best.Subject, worst.Subject, best.Average, worst.Average, has)
	return httpx.OK(c, fiber.Map{"tip": tip})
}

func bestWorst(subs []store.SubjectAverage) (best, worst store.SubjectAverage, has bool) {
	if len(subs) == 0 {
		return
	}
	best, worst = subs[0], subs[0]
	for _, s := range subs {
		if s.Average > best.Average {
			best = s
		}
		if s.Average < worst.Average {
			worst = s
		}
	}
	return best, worst, true
}

func firstWord(s string) string {
	if i := strings.IndexByte(s, ' '); i > 0 {
		return s[:i]
	}
	return s
}
