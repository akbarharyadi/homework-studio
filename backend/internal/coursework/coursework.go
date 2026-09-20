// Package coursework runs the teacher-side ingest flow for one uploaded material:
//
//	read text -> index for the tutor (RAG) -> teaching notes -> generate an exam
//
// Low-confidence generated questions are flagged so the teacher reviews them before
// the exam is published. It mirrors the (old) homework pipeline, but the human is in
// the loop on AI-authored questions instead of on an OCR read.
package coursework

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"homework-studio/internal/ai"
	"homework-studio/internal/domain"
	"homework-studio/internal/store"
	"homework-studio/internal/tutor"
	"homework-studio/internal/vision"
)

type Pipeline struct {
	store      *store.Store
	visionCli  *ai.Client
	tutor      *tutor.Service
	examSize   int
	storageDir string
}

func New(s *store.Store, visionCli *ai.Client, tut *tutor.Service, examSize int, storageDir string) *Pipeline {
	if examSize <= 0 {
		examSize = 8
	}
	return &Pipeline{store: s, visionCli: visionCli, tutor: tut, examSize: examSize, storageDir: storageDir}
}

// Run processes one material end-to-end. Safe to call in a goroutine; it manages
// its own status transitions.
func (p *Pipeline) Run(ctx context.Context, m *domain.Material, subjectName string) error {
	p.store.SetMaterialStatus(ctx, m.ID, domain.MaterialProcessing)

	data, err := os.ReadFile(filepath.Join(p.storageDir, m.StorageKey))
	if err != nil {
		p.store.SetMaterialStatus(ctx, m.ID, domain.MaterialFailed)
		return fmt.Errorf("read material: %w", err)
	}

	text, terr := vision.ReadText(ctx, p.visionCli, m.SourceFilename, data)
	if terr != nil || strings.TrimSpace(text) == "" {
		text = "Uploaded material: " + m.Title
	}

	// 1) Index into RAG so the student tutor answers from this class's material.
	for i, chunk := range chunkText(text, 700) {
		_ = p.store.CreateChunk(ctx, m.ID, chunk, nil, i+1)
	}

	// 2) Teaching notes (a lesson summary the teacher can use).
	notes := p.tutor.GenerateNotes(ctx, m.TenantID, subjectName, text)
	p.store.SetMaterialSummary(ctx, m.ID, notes)

	// 3) Generate an exam grounded in the material; gate low-confidence questions.
	qs, gerr := p.tutor.GenerateExam(ctx, m.TenantID, m.SubjectID, subjectName, text, p.examSize)
	if gerr != nil || len(qs) == 0 {
		// Notes + RAG still succeeded; just no exam this time.
		p.store.SetMaterialStatus(ctx, m.ID, domain.MaterialReady)
		return gerr
	}

	sid, mid := m.SubjectID, m.ID
	exam := &domain.Exam{
		TenantID:      m.TenantID,
		SubjectID:     &sid,
		MaterialID:    &mid,
		Title:         m.Title + " — Exam",
		Status:        domain.ExamDraft,
		QuestionCount: len(qs),
		CreatedBy:     m.UploadedBy,
	}
	if err := p.store.CreateExam(ctx, exam); err != nil {
		p.store.SetMaterialStatus(ctx, m.ID, domain.MaterialFailed)
		return err
	}

	flagged := 0
	for i := range qs {
		qs[i].ID = ""
		qs[i].TenantID = m.TenantID
		qs[i].SubjectID = m.SubjectID
		qs[i].ExamID = &exam.ID
		if qs[i].NeedsReview {
			flagged++
		}
		_ = p.store.CreateQuestion(ctx, &qs[i])
	}

	// Automation: an exam with no low-confidence questions publishes itself; anything
	// flagged waits for the teacher.
	if flagged > 0 {
		p.store.SetExamStatus(ctx, exam.ID, domain.ExamNeedsReview)
	} else {
		_ = p.store.PublishExam(ctx, m.TenantID, exam.ID)
		p.store.InsertEvent(ctx, m.TenantID, "publish", "",
			fmt.Sprintf("Auto-published “%s” · %d questions", exam.Title, len(qs)), 0)
	}
	p.store.SetMaterialStatus(ctx, m.ID, domain.MaterialReady)
	return nil
}

// chunkText splits text into ~size-character pieces on line boundaries for RAG.
func chunkText(text string, size int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	lines := strings.Split(text, "\n")
	out := []string{}
	var b strings.Builder
	flush := func() {
		if s := strings.TrimSpace(b.String()); s != "" {
			out = append(out, s)
		}
		b.Reset()
	}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if b.Len()+len(line) > size && b.Len() > 0 {
			flush()
		}
		b.WriteString(line)
		b.WriteString(" ")
	}
	flush()
	if len(out) == 0 {
		out = []string{text}
	}
	return out
}
