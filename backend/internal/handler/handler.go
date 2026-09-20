// Package handler holds the Fiber HTTP handlers, grouped by resource.
package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/auth"
	"homework-studio/internal/config"
	"homework-studio/internal/coursework"
	"homework-studio/internal/middleware"
	"homework-studio/internal/scheduler"
	"homework-studio/internal/store"
	"homework-studio/internal/tutor"
)

// Handler bundles every dependency the routes need.
type Handler struct {
	cfg        *config.Config
	store      *store.Store
	auth       *auth.Manager
	coursework *coursework.Pipeline
	tutor      *tutor.Service
	scheduler  *scheduler.Scheduler
}

func New(
	cfg *config.Config,
	s *store.Store,
	authMgr *auth.Manager,
	cw *coursework.Pipeline,
	tut *tutor.Service,
	sched *scheduler.Scheduler,
) *Handler {
	return &Handler{cfg: cfg, store: s, auth: authMgr, coursework: cw, tutor: tut, scheduler: sched}
}

// parentOwnsStudent reports whether the caller is the parent of the given student.
func (h *Handler) parentOwnsStudent(c *fiber.Ctx, tenantID, studentID string) bool {
	st, err := h.store.GetStudent(c.Context(), tenantID, studentID)
	if err != nil || st.ParentUserID == nil {
		return false
	}
	return *st.ParentUserID == middleware.UserID(c)
}
