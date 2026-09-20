// Package pipeline runs the ingest flow for one homework:
//
//	read -> extract -> classify (jev) -> grade -> confidence gate -> decide
//
// It mirrors the DocumentIngest pipeline in miniature: anything the model was not
// confident about opens a teacher review task instead of silently auto-grading.
package pipeline

import (
	"context"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"

	"homework-studio/internal/domain"
	"homework-studio/internal/store"
	"homework-studio/internal/vision"
)

type Pipeline struct {
	store      *store.Store
	extractor  vision.Extractor
	classifier vision.Classifier
	threshold  float64
	storageDir string
}

func New(s *store.Store, ex vision.Extractor, cl vision.Classifier, threshold float64, storageDir string) *Pipeline {
	return &Pipeline{store: s, extractor: ex, classifier: cl, threshold: threshold, storageDir: storageDir}
}

// Run processes a homework end-to-end and persists the graded result. Safe to
// call in a goroutine; it manages its own status transitions.
func (p *Pipeline) Run(ctx context.Context, hw *domain.Homework) error {
	_ = p.store.SetHomeworkStatus(ctx, hw.ID, domain.HWProcessing)

	data, err := os.ReadFile(filepath.Join(p.storageDir, hw.StorageKey))
	if err != nil {
		_ = p.store.SetHomeworkStatus(ctx, hw.ID, domain.HWFailed)
		return fmt.Errorf("read upload: %w", err)
	}

	subjects, err := p.store.ListSubjects(ctx, hw.TenantID)
	if err != nil {
		_ = p.store.SetHomeworkStatus(ctx, hw.ID, domain.HWFailed)
		return err
	}
	known := make([]string, len(subjects))
	for i, s := range subjects {
		known[i] = s.Name
	}

	out, err := p.extractor.Extract(ctx, vision.ExtractInput{
		Filename: hw.SourceFilename, Data: data, KnownSubjects: known,
	})
	if err != nil {
		_ = p.store.SetHomeworkStatus(ctx, hw.ID, domain.HWFailed)
		return fmt.Errorf("extract: %w", err)
	}

	// Classification (jev/TypeAI when configured, keyword fallback otherwise).
	sample := hw.SourceFilename
	for i, it := range out.Items {
		if i >= 2 {
			break
		}
		sample += "\n" + it.QuestionText
	}
	detected := out.DetectedSubject
	if subj, conf := p.classifier.Classify(ctx, sample, known); subj != "" && conf > 0 {
		detected = subj
	}

	var subjectID *string
	for i := range subjects {
		if strings.EqualFold(subjects[i].Name, detected) {
			subjectID = &subjects[i].ID
			break
		}
	}

	// Grade + gate.
	items := make([]domain.HomeworkItem, 0, len(out.Items))
	tasks := make([]domain.ReviewTask, 0)
	var score, maxScore float64
	minConf := 1.0

	for _, ex := range out.Items {
		const maxMarks = 1.0
		isCorrect := normalize(ex.StudentAnswer) == normalize(ex.CorrectAnswer)
		marks := 0.0
		if isCorrect {
			marks = maxMarks
		}
		needsReview := ex.Confidence < p.threshold

		correct := isCorrect
		item := domain.HomeworkItem{
			QuestionNo:    ex.QuestionNo,
			QuestionText:  ex.QuestionText,
			StudentAnswer: ex.StudentAnswer,
			CorrectAnswer: ex.CorrectAnswer,
			IsCorrect:     &correct,
			Marks:         marks,
			MaxMarks:      maxMarks,
			Confidence:    ex.Confidence,
			NeedsReview:   needsReview,
		}
		items = append(items, item)

		score += marks
		maxScore += maxMarks
		if ex.Confidence < minConf {
			minConf = ex.Confidence
		}
		if needsReview {
			tasks = append(tasks, domain.ReviewTask{
				FieldName: fmt.Sprintf("Q%d answer", ex.QuestionNo),
				Reason:    fmt.Sprintf("low read confidence (%.0f%%) — please confirm", ex.Confidence*100),
			})
		}
	}

	// Decide: any review task -> needs_review; else graded.
	status := domain.HWGraded
	if len(tasks) > 0 {
		status = domain.HWNeedsReview
	}

	percent := 0.0
	if maxScore > 0 {
		percent = math.Round(score/maxScore*10000) / 100
	}

	hw.Status = status
	hw.SubjectID = subjectID
	hw.DetectedSubject = detected
	hw.Score = score
	hw.MaxScore = maxScore
	hw.Percent = percent
	hw.Confidence = minConf

	// The tasks need item IDs; SaveExtraction assigns item IDs, so link tasks to
	// their items by question number after the fact inside the store is complex —
	// instead we attach item indices here by matching question numbers.
	linkTasksToItems(items, tasks)

	return p.store.SaveExtraction(ctx, hw, items, tasks)
}

// linkTasksToItems sets each task's ItemID from the matching item (by the Q number
// embedded in FieldName). Item IDs are assigned lazily in the store, so we assign
// them here to keep the foreign key intact.
func linkTasksToItems(items []domain.HomeworkItem, tasks []domain.ReviewTask) {
	// Ensure every item has an ID now (store will reuse non-empty IDs).
	byNo := make(map[int]*domain.HomeworkItem, len(items))
	for i := range items {
		if items[i].ID == "" {
			items[i].ID = domain.NewID()
		}
		byNo[items[i].QuestionNo] = &items[i]
	}
	for i := range tasks {
		var qno int
		_, _ = fmt.Sscanf(tasks[i].FieldName, "Q%d answer", &qno)
		if it, ok := byNo[qno]; ok {
			id := it.ID
			tasks[i].ItemID = &id
		}
	}
}

func normalize(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "(unclear)", "")
	return strings.TrimSpace(s)
}
