package handler

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"

	"homework-studio/internal/domain"
	"homework-studio/internal/httpx"
	"homework-studio/internal/middleware"
	"homework-studio/internal/store"
)

// UploadHomework accepts a homework file (multipart) and kicks off ingestion.
// form fields: file (required), student_id (required), title (optional).
func (h *Handler) UploadHomework(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	studentID := c.FormValue("student_id")
	if studentID == "" {
		return httpx.BadRequest(c, "student_id is required")
	}
	if _, err := h.store.GetStudent(c.Context(), tenantID, studentID); err != nil {
		return httpx.BadRequest(c, "unknown student")
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return httpx.BadRequest(c, "file is required")
	}
	src, err := fileHeader.Open()
	if err != nil {
		return httpx.Internal(c, "cannot open upload")
	}
	defer src.Close()
	data, err := io.ReadAll(src)
	if err != nil {
		return httpx.Internal(c, "cannot read upload")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".pdf" && ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		return httpx.BadRequest(c, "only PDF or image (png/jpg) uploads are supported")
	}

	key := domain.NewID() + ext
	if err := os.MkdirAll(h.cfg.StorageDir, 0o755); err != nil {
		return httpx.Internal(c, "storage error")
	}
	if err := os.WriteFile(filepath.Join(h.cfg.StorageDir, key), data, 0o644); err != nil {
		return httpx.Internal(c, "could not store file")
	}

	title := c.FormValue("title")
	if title == "" {
		title = strings.TrimSuffix(fileHeader.Filename, ext)
	}
	hw := &domain.Homework{
		TenantID:       tenantID,
		StudentID:      studentID,
		Title:          title,
		Status:         domain.HWPending,
		SourceFilename: fileHeader.Filename,
		StorageKey:     key,
		UploadedBy:     middleware.UserID(c),
	}
	if err := h.store.CreateHomework(c.Context(), hw); err != nil {
		return httpx.Internal(c, "could not create homework")
	}

	// Process asynchronously with a detached context (request ctx ends at response).
	go func(hwCopy domain.Homework) {
		_ = h.pipeline.Run(context.Background(), &hwCopy)
	}(*hw)

	return httpx.Created(c, fiber.Map{"id": hw.ID, "status": hw.Status})
}

// ListHomeworks returns homeworks for the tenant, optionally filtered.
func (h *Handler) ListHomeworks(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	f := store.HomeworkFilter{StudentID: c.Query("student_id"), Status: c.Query("status")}

	// Parents only see their own children's homework.
	if middleware.Role(c) == domain.RoleParent {
		if f.StudentID == "" {
			return httpx.BadRequest(c, "student_id required")
		}
		if !h.parentOwnsStudent(c, tenantID, f.StudentID) {
			return httpx.Forbidden(c, "not your student")
		}
	}

	items, err := h.store.ListHomeworks(c.Context(), tenantID, f)
	if err != nil {
		return httpx.Internal(c, "could not list homeworks")
	}
	return httpx.OK(c, items)
}

// GetHomework returns one homework with its graded items.
func (h *Handler) GetHomework(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	hw, err := h.store.GetHomework(c.Context(), tenantID, c.Params("id"))
	if err != nil {
		return httpx.NotFound(c, "homework not found")
	}
	if middleware.Role(c) == domain.RoleParent && !h.parentOwnsStudent(c, tenantID, hw.StudentID) {
		return httpx.Forbidden(c, "not your student")
	}
	items, _ := h.store.GetHomeworkItems(c.Context(), hw.ID)
	return httpx.OK(c, fiber.Map{"homework": hw, "items": items})
}

// HomeworkStatus is a cheap poll for the upload UI.
func (h *Handler) HomeworkStatus(c *fiber.Ctx) error {
	hw, err := h.store.GetHomework(c.Context(), middleware.TenantID(c), c.Params("id"))
	if err != nil {
		return httpx.NotFound(c, "homework not found")
	}
	return httpx.OK(c, fiber.Map{
		"id": hw.ID, "status": hw.Status, "percent": hw.Percent, "confidence": hw.Confidence,
	})
}

func (h *Handler) parentOwnsStudent(c *fiber.Ctx, tenantID, studentID string) bool {
	st, err := h.store.GetStudent(c.Context(), tenantID, studentID)
	if err != nil || st.ParentUserID == nil {
		return false
	}
	return *st.ParentUserID == middleware.UserID(c)
}
