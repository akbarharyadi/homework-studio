// Package router wires HTTP routes to handlers with auth + role guards.
package router

import (
	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/auth"
	"homework-studio/internal/domain"
	"homework-studio/internal/handler"
	"homework-studio/internal/middleware"
)

// Setup registers all routes on the Fiber app.
func Setup(app *fiber.App, h *handler.Handler, authMgr *auth.Manager) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api/v1")

	// Public.
	api.Post("/auth/login", h.Login)

	// Authenticated.
	authed := api.Group("", middleware.RequireAuth(authMgr))
	authed.Get("/auth/me", h.Me)
	authed.Get("/subjects", h.ListSubjects)
	authed.Get("/students", h.ListStudents)
	authed.Get("/students/:id/progress", h.StudentProgress)

	// Auto-generated weekly report (produced by the background scheduler).
	authed.Get("/reports/student/:id", h.LatestStudentReport)

	// Homework.
	authed.Get("/homeworks", h.ListHomeworks)
	authed.Get("/homeworks/:id", h.GetHomework)
	authed.Get("/homeworks/:id/status", h.HomeworkStatus)
	authed.Post("/homeworks",
		middleware.RequireRole(domain.RoleTeacher, domain.RoleAdmin), h.UploadHomework)

	// Teacher review queue.
	review := authed.Group("/review", middleware.RequireRole(domain.RoleTeacher, domain.RoleAdmin))
	review.Get("/tasks", h.ListReviewTasks)
	review.Post("/tasks/:id/resolve", h.ResolveReviewTask)

	// Teacher dashboard.
	authed.Get("/dashboard/class",
		middleware.RequireRole(domain.RoleTeacher, domain.RoleAdmin), h.ClassStats)

	// Admin monitoring + automation.
	admin := authed.Group("/admin", middleware.RequireRole(domain.RoleAdmin))
	admin.Get("/overview", h.AdminOverview)
	admin.Get("/automation", h.AdminAutomation)
	admin.Post("/automation/run", h.RunAutomation)

	// AI tutor.
	authed.Get("/questions/:id/explain", h.ExplainQuestion)
	authed.Post("/practice/generate", h.GeneratePractice)
	authed.Post("/practice/:id/submit", h.SubmitPractice)
	authed.Post("/tutor/chat", h.TutorChat)
}
