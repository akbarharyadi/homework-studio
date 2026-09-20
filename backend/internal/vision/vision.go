// Package vision turns an uploaded homework file into structured, confidence-
// scored items. The mock extractor is deterministic and needs no API key, so the
// public demo runs free; a real provider implements the same Extractor interface.
package vision

import (
	"context"
	"fmt"
	"hash/fnv"
	"strings"
)

// ExtractInput is one uploaded homework file plus the subjects we know about.
type ExtractInput struct {
	Filename      string
	Data          []byte
	KnownSubjects []string
}

// ExtractedItem is one question read off the sheet, with a calibrated confidence.
type ExtractedItem struct {
	QuestionNo    int
	QuestionText  string
	StudentAnswer string
	CorrectAnswer string
	Confidence    float64
}

// ExtractOutput is the whole read: the items plus a subject guess.
type ExtractOutput struct {
	Items             []ExtractedItem
	DetectedSubject   string
	SubjectConfidence float64
}

// Extractor reads a homework file into items.
type Extractor interface {
	Extract(ctx context.Context, in ExtractInput) (ExtractOutput, error)
	Name() string
}

// MockExtractor produces deterministic, realistic-looking homework from the file
// name + bytes, so demos are reproducible. One item is deliberately low-confidence
// to exercise the confidence gate and open a teacher review task.
type MockExtractor struct{}

func (MockExtractor) Name() string { return "mock" }

func (MockExtractor) Extract(_ context.Context, in ExtractInput) (ExtractOutput, error) {
	seed := hashSeed(in.Filename, len(in.Data))
	subject := detectSubject(in.Filename, seed)

	items := make([]ExtractedItem, 0, 5)
	for i := 0; i < 5; i++ {
		it := buildItem(subject, seed, i)
		// The middle item simulates messy handwriting: low confidence -> review.
		if i == 2 {
			it.Confidence = 0.55 + float64(seed%10)/100.0 // 0.55–0.64
			it.StudentAnswer = it.StudentAnswer + " (unclear)"
		}
		items = append(items, it)
	}

	return ExtractOutput{
		Items:             items,
		DetectedSubject:   subject,
		SubjectConfidence: 0.9,
	}, nil
}

func buildItem(subject string, seed uint32, i int) ExtractedItem {
	n := seed>>uint(i*3) + uint32(i)
	if strings.EqualFold(subject, "Science") {
		q := sciencePool[int(n)%len(sciencePool)]
		studentWrong := (n % 3) == 0
		student := q.answer
		if studentWrong {
			student = q.distractor
		}
		return ExtractedItem{
			QuestionNo:    i + 1,
			QuestionText:  q.stem,
			StudentAnswer: student,
			CorrectAnswer: q.answer,
			Confidence:    0.88 + float64(n%10)/100.0, // 0.88–0.97
		}
	}
	// Default: Math arithmetic.
	a := int(n%12) + 3
	b := int((n/7)%9) + 2
	correct := a + b
	studentWrong := (n % 4) == 0
	student := correct
	if studentWrong {
		student = correct + 1
	}
	return ExtractedItem{
		QuestionNo:    i + 1,
		QuestionText:  fmt.Sprintf("%d + %d = ?", a, b),
		StudentAnswer: fmt.Sprintf("%d", student),
		CorrectAnswer: fmt.Sprintf("%d", correct),
		Confidence:    0.9 + float64(n%8)/100.0, // 0.90–0.97
	}
}

type sciQ struct{ stem, answer, distractor string }

var sciencePool = []sciQ{
	{"Which gas do plants absorb during photosynthesis?", "Carbon dioxide", "Oxygen"},
	{"What is the closest planet to the Sun?", "Mercury", "Venus"},
	{"What state of matter is water at 0°C and below?", "Solid", "Liquid"},
	{"What organ pumps blood around the body?", "Heart", "Lungs"},
	{"How many legs does an insect have?", "6", "8"},
	{"What force pulls objects toward Earth?", "Gravity", "Friction"},
}

func detectSubject(filename string, seed uint32) string {
	f := strings.ToLower(filename)
	switch {
	case strings.Contains(f, "sci") || strings.Contains(f, "bio") || strings.Contains(f, "phys"):
		return "Science"
	case strings.Contains(f, "math") || strings.Contains(f, "mtk") || strings.Contains(f, "arith"):
		return "Math"
	default:
		if seed%2 == 0 {
			return "Math"
		}
		return "Science"
	}
}

func hashSeed(s string, n int) uint32 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(fmt.Sprintf("%s|%d", s, n)))
	return h.Sum32()
}
