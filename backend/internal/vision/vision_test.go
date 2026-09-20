package vision

import (
	"context"
	"testing"
)

// ReadText reads plain-text materials directly (no AI client needed).
func TestReadTextPlainFilesReadDirectly(t *testing.T) {
	body := "# Fractions\nA fraction is a part of a whole.\n"
	for _, name := range []string{"lesson.txt", "lesson.md", "data.csv"} {
		got, err := ReadText(context.Background(), nil, name, []byte(body))
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if got != body {
			t.Fatalf("%s: want raw text back, got %q", name, got)
		}
	}
}

// With no client and non-text bytes, ReadText degrades to a labelled placeholder
// rather than panicking, so the coursework pipeline never breaks.
func TestReadTextBinaryFallback(t *testing.T) {
	got, err := ReadText(context.Background(), nil, "scan.png", []byte{0x00, 0x01, 0x02, 0xff})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == "" {
		t.Fatal("expected a placeholder, got empty string")
	}
}
