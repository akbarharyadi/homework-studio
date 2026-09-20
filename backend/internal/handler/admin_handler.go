package handler

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/domain"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
)

// AdminOverview is the school-wide monitoring summary.
func (h *Handler) AdminOverview(c *fiber.Ctx) error {
	tid := middleware.TenantID(c)
	ctx := c.Context()
	stats, err := h.store.ClassStats(ctx, tid)
	if err != nil {
		return httpx.Internal(c, "could not load overview")
	}
	rows, _ := h.store.AdminStudentRows(ctx, tid)
	return httpx.OK(c, fiber.Map{
		"students":          stats.Students,
		"teachers":          h.store.CountUsersByRole(ctx, tid, domain.RoleTeacher),
		"parents":           h.store.CountUsersByRole(ctx, tid, domain.RoleParent),
		"exams_taken":       stats.ExamsTaken,
		"average_percent":   stats.AveragePercent,
		"pending_review":    stats.PendingReview,
		"reports_generated": h.store.CountReports(ctx, tid),
		"score_buckets":     stats.ScoreBuckets,
		"subject_averages":  stats.SubjectAverages,
		"students_rows":     rows,
	})
}

// AdminAutomation shows the background scheduler + AI status and a live feed of
// what it has produced — the UI's window onto the automation.
func (h *Handler) AdminAutomation(c *fiber.Ctx) error {
	tid := middleware.TenantID(c)
	ctx := c.Context()
	events, _ := h.store.RecentEvents(ctx, tid, 15)
	return httpx.OK(c, fiber.Map{
		"enabled":           h.cfg.SchedulerEnabled,
		"interval":          h.cfg.SchedulerInterval,
		"last_run":          h.store.LastReportTime(ctx, tid),
		"reports_generated": h.store.CountReports(ctx, tid),
		"flags":             h.store.CountEventsByKind(ctx, tid, "alert"),
		"vision_reader":     h.cfg.VisionProvider,
		"tutor_provider":    h.cfg.AIProvider,
		"events":            events,
	})
}

// AdminEngagement is the school-wide gamification summary.
func (h *Handler) AdminEngagement(c *fiber.Ctx) error {
	eng, err := h.store.SchoolEngagement(c.Context(), middleware.TenantID(c))
	if err != nil {
		return httpx.Internal(c, "could not load engagement")
	}
	return httpx.OK(c, eng)
}

// AdminTrend is the school average + activity over the last 14 days.
func (h *Handler) AdminTrend(c *fiber.Ctx) error {
	pts, err := h.store.SchoolTrend(c.Context(), middleware.TenantID(c), 14)
	if err != nil {
		return httpx.Internal(c, "could not load trend")
	}
	return httpx.OK(c, pts)
}

// AdminTeaching is the content pipeline + per-exam analytics.
func (h *Handler) AdminTeaching(c *fiber.Ctx) error {
	t, err := h.store.TeachingOverview(c.Context(), middleware.TenantID(c))
	if err != nil {
		return httpx.Internal(c, "could not load teaching overview")
	}
	return httpx.OK(c, t)
}

// RunAutomation triggers the scheduler's job immediately (the "Run now" button).
func (h *Handler) RunAutomation(c *fiber.Ctx) error {
	if h.scheduler == nil {
		return httpx.BadRequest(c, "scheduler not enabled")
	}
	n, err := h.scheduler.RunOnce(c.Context())
	if err != nil {
		return httpx.Internal(c, "run failed")
	}
	return httpx.OK(c, fiber.Map{"reports": n})
}
