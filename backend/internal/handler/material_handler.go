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
)

var allowedMaterialExt = map[string]bool{
	".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".txt": true, ".md": true,
}

// UploadMaterial accepts a teaching material (multipart) and kicks off the coursework
// pipeline: read → index for the tutor (RAG) → teaching notes → generate an exam.
// form fields: file (required), subject_id (required), title (optional).
func (h *Handler) UploadMaterial(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	subjectID := c.FormValue("subject_id")
	if subjectID == "" {
		return httpx.BadRequest(c, "subject_id is required")
	}
	subject, err := h.store.GetSubjectByID(c.Context(), subjectID)
	if err != nil || subject.TenantID != tenantID {
		return httpx.BadRequest(c, "unknown subject")
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return httpx.BadRequest(c, "file is required")
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedMaterialExt[ext] {
		return httpx.BadRequest(c, "supported formats: PDF, PNG, JPG, TXT, MD")
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
	m := &domain.Material{
		TenantID:       tenantID,
		SubjectID:      subjectID,
		Title:          title,
		Source:         "upload",
		UploadedBy:     middleware.UserID(c),
		Status:         domain.MaterialProcessing,
		StorageKey:     key,
		SourceFilename: fileHeader.Filename,
	}
	if err := h.store.CreateMaterialFull(c.Context(), m); err != nil {
		return httpx.Internal(c, "could not create material")
	}

	// Process asynchronously with a detached context (request ctx ends at response).
	go func(mc domain.Material, subjectName string) {
		_ = h.coursework.Run(context.Background(), &mc, subjectName)
	}(*m, subject.Name)

	return httpx.Created(c, fiber.Map{"id": m.ID, "status": m.Status})
}

// ListMaterials returns the tenant's materials + their generated-exam status.
func (h *Handler) ListMaterials(c *fiber.Ctx) error {
	rows, err := h.store.ListMaterials(c.Context(), middleware.TenantID(c))
	if err != nil {
		return httpx.Internal(c, "could not list materials")
	}
	return httpx.OK(c, rows)
}

// GetMaterial returns one material with its AI teaching notes.
func (h *Handler) GetMaterial(c *fiber.Ctx) error {
	m, err := h.store.GetMaterial(c.Context(), middleware.TenantID(c), c.Params("id"))
	if err != nil {
		return httpx.NotFound(c, "material not found")
	}
	return httpx.OK(c, m)
}

// MaterialStatus is a cheap poll for the upload UI.
func (h *Handler) MaterialStatus(c *fiber.Ctx) error {
	m, err := h.store.GetMaterial(c.Context(), middleware.TenantID(c), c.Params("id"))
	if err != nil {
		return httpx.NotFound(c, "material not found")
	}
	return httpx.OK(c, fiber.Map{"id": m.ID, "status": m.Status})
}
