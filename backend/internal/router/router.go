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
	authed.Get("/students/:id/gamification", h.StudentGamification)
	authed.Get("/students/:id/attempts", h.ListAttempts)
	authed.Get("/attempts/:id/review", h.AttemptReview)
	authed.Get("/leaderboard", h.Leaderboard)

	// Auto-generated weekly report (produced by the background scheduler).
	authed.Get("/reports/student/:id", h.LatestStudentReport)

	// Student — take a published exam, get explanations, chat with the tutor.
	// (Register the static /exams/published before the teacher's /exams/:id.)
	authed.Get("/exams/published", h.ListPublishedExams)
	authed.Post("/exams/:id/start", h.StartExam)
	authed.Post("/practice/generate", h.GeneratePractice)
	authed.Post("/practice/:id/submit", h.SubmitPractice)
	authed.Get("/questions/:id/explain", h.ExplainQuestion)
	authed.Post("/tutor/chat", h.TutorChat)

	// Teacher / admin — teaching material + the exams the AI generates from it.
	teach := authed.Group("", middleware.RequireRole(domain.RoleTeacher, domain.RoleAdmin))
	teach.Post("/materials", h.UploadMaterial)
	teach.Get("/materials", h.ListMaterials)
	teach.Get("/materials/:id", h.GetMaterial)
	teach.Get("/materials/:id/status", h.MaterialStatus)
	teach.Get("/exams", h.ListExams)
	teach.Get("/exams/:id", h.GetExam)
	teach.Post("/exams/:id/publish", h.PublishExam)
	teach.Post("/exams/:id/questions/:qid/discard", h.DiscardExamQuestion)
	teach.Get("/dashboard/class", h.ClassStats)

	// Admin monitoring + automation.
	admin := authed.Group("/admin", middleware.RequireRole(domain.RoleAdmin))
	admin.Get("/overview", h.AdminOverview)
	admin.Get("/automation", h.AdminAutomation)
	admin.Post("/automation/run", h.RunAutomation)
}
