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
		"homeworks_graded":  stats.HomeworksGraded,
		"average_percent":   stats.AveragePercent,
		"needs_review":      stats.NeedsReview,
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
	recent, _ := h.store.RecentReports(ctx, tid, 12)
	return httpx.OK(c, fiber.Map{
		"enabled":           h.cfg.SchedulerEnabled,
		"interval":          h.cfg.SchedulerInterval,
		"last_run":          h.store.LastReportTime(ctx, tid),
		"reports_generated": h.store.CountReports(ctx, tid),
		"vision_reader":     h.cfg.VisionProvider,
		"tutor_provider":    h.cfg.AIProvider,
		"recent":            recent,
	})
}
