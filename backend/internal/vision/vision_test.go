package vision

import (
	"context"
	"testing"
)

func TestMockExtractorDeterministicAndGated(t *testing.T) {
	in := ExtractInput{Filename: "math-worksheet.pdf", Data: []byte("abc")}
	a, err := MockExtractor{}.Extract(context.Background(), in)
	if err != nil {
		t.Fatalf("extract: %v", err)
	}
	b, _ := MockExtractor{}.Extract(context.Background(), in)

	if len(a.Items) != 5 {
		t.Fatalf("want 5 items, got %d", len(a.Items))
	}
	if a.DetectedSubject != "Math" {
		t.Fatalf("want Math subject, got %q", a.DetectedSubject)
	}
	if a.Items[0].StudentAnswer != b.Items[0].StudentAnswer {
		t.Fatal("extraction is not deterministic")
	}
	// The middle item must be low-confidence so the gate opens a review task.
	if a.Items[2].Confidence >= 0.80 {
		t.Fatalf("expected low-confidence middle item, got %.2f", a.Items[2].Confidence)
	}
}

func TestKeywordClassifier(t *testing.T) {
	c := KeywordClassifier{}
	subj, conf := c.Classify(context.Background(), "photosynthesis in plants", []string{"Math", "Science"})
	if subj != "Science" || conf == 0 {
		t.Fatalf("want Science, got %q (%.2f)", subj, conf)
	}
}
