package vision

import (
	"context"
	"strings"

	"homework-studio/internal/ai"
)

// Classifier decides which subject a homework belongs to. In production this is
// backed by jev (TypeAI); the keyword classifier is the free/offline fallback.
type Classifier interface {
	Classify(ctx context.Context, sample string, known []string) (subject string, confidence float64)
	Name() string
}

// NewClassifier returns the jev/LLM classifier when a real client is configured,
// otherwise a deterministic keyword classifier.
func NewClassifier(provider string, client *ai.Client) Classifier {
	if provider != "mock" && client != nil && client.Enabled() {
		return &LLMClassifier{client: client, provider: provider}
	}
	return KeywordClassifier{}
}

// KeywordClassifier matches obvious subject words in the sample text.
type KeywordClassifier struct{}

func (KeywordClassifier) Name() string { return "keyword" }

func (KeywordClassifier) Classify(_ context.Context, sample string, known []string) (string, float64) {
	s := strings.ToLower(sample)
	for _, subj := range known {
		if strings.Contains(s, strings.ToLower(subj)) {
			return subj, 0.75
		}
	}
	switch {
	case strings.Contains(s, "photosynth"), strings.Contains(s, "planet"),
		strings.Contains(s, "gravity"), strings.Contains(s, "organ"):
		return firstMatch(known, "Science"), 0.7
	case strings.Contains(s, "+"), strings.Contains(s, "="), strings.Contains(s, "sum"):
		return firstMatch(known, "Math"), 0.7
	}
	return "", 0
}

// LLMClassifier asks jev/TypeAI to pick the subject. It degrades gracefully:
// any error or unrecognised answer returns an empty subject so the pipeline
// falls back to the extractor's own guess.
type LLMClassifier struct {
	client   *ai.Client
	provider string
}

func (c *LLMClassifier) Name() string { return "jev/" + c.provider }

func (c *LLMClassifier) Classify(ctx context.Context, sample string, known []string) (string, float64) {
	list := strings.Join(known, ", ")
	prompt := "Classify the school homework below into exactly one of these subjects: " + list +
		".\nReply with ONLY the subject name, nothing else.\n\nHomework:\n" + sample
	out, _, err := c.client.Chat(ctx, []ai.Message{
		{Role: "system", Content: "You are a precise text classifier for a K-6 education platform."},
		{Role: "user", Content: prompt},
	}, 0.0, 16)
	if err != nil {
		return "", 0
	}
	answer := strings.TrimSpace(out)
	for _, subj := range known {
		if strings.EqualFold(answer, subj) || strings.Contains(strings.ToLower(answer), strings.ToLower(subj)) {
			return subj, 0.92
		}
	}
	return "", 0
}

func firstMatch(known []string, want string) string {
	for _, k := range known {
		if strings.EqualFold(k, want) {
			return k
		}
	}
	return want
}
