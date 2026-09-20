// Package tutor implements the AI tutor: step-by-step explanations, a per-student
// practice generator, grading, and a RAG chat. Logic is adapted from ai-cbt
// (practice scoring, cached LaTeX explanations, stratified generation). It runs
// fully on the mock provider (no key) and upgrades to DeepSeek/GLM/TypeAI via env.
package tutor

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"homework-studio/internal/ai"
	"homework-studio/internal/domain"
	"homework-studio/internal/store"
)

type Service struct {
	client *ai.Client
	store  *store.Store
}

func New(client *ai.Client, s *store.Store) *Service {
	return &Service{client: client, store: s}
}

// Explain returns a step-by-step, LaTeX-friendly walkthrough of a question.
// Bank explanations are free; otherwise ask the LLM, or fall back to mock.
func (s *Service) Explain(ctx context.Context, tenantID string, studentID *string, questionID string) (string, error) {
	q, err := s.store.GetQuestion(ctx, questionID)
	if err != nil {
		return "", err
	}
	if q.Explanation != "" {
		return q.Explanation, nil
	}
	if s.client.Enabled() {
		prompt := fmt.Sprintf(
			"Explain step by step how to answer this question for a primary-school student.\n"+
				"Question: %s\nOptions: %v\nCorrect answer: %s\n"+
				"Use LaTeX ($...$) for any math. Keep it warm and encouraging.",
			q.Stem, q.Options, q.Answer)
		out, usage, err := s.client.Chat(ctx, []ai.Message{
			{Role: "system", Content: "You are a friendly tutor for children aged 6–12."},
			{Role: "user", Content: prompt},
		}, 0.2, 1024)
		if err == nil {
			s.store.LogAIUsage(ctx, tenantID, studentID, "explanation",
				usage.PromptTokens, usage.CompletionTokens, s.client.Model())
			return out, nil
		}
	}
	return mockExplanation(q), nil
}

func mockExplanation(q *domain.Question) string {
	var b strings.Builder
	b.WriteString("Let's work it out together! 🙂\n\n")
	b.WriteString("**Question:** " + q.Stem + "\n\n")
	b.WriteString("**Step 1 — Read carefully.** Underline what is being asked.\n")
	b.WriteString("**Step 2 — Think about what you know** that connects to it.\n")
	b.WriteString("**Step 3 — Solve one small piece at a time.**\n")
	if q.Answer != "" {
		b.WriteString(fmt.Sprintf("\n**Answer:** %s\n", q.Answer))
	}
	b.WriteString("\n_Great effort — try the next one!_")
	return b.String()
}

// GeneratePractice picks `count` questions for a student, stratified across
// difficulties (adapted from ai-cbt's exam generator). Returns the created set and
// the client-safe questions (answers stripped).
func (s *Service) GeneratePractice(ctx context.Context, tenantID, studentID, subjectID string, count int) (*domain.PracticeSet, []domain.Question, error) {
	if count <= 0 {
		count = 5
	}
	// Stratified sample: aim for a spread of easy/medium/hard.
	buckets := []string{domain.DiffEasy, domain.DiffMedium, domain.DiffHard}
	picked := map[string]domain.Question{}
	per := count/len(buckets) + 1
	for _, d := range buckets {
		qs, _ := s.store.ListQuestions(ctx, tenantID, subjectID, d, per)
		for _, q := range qs {
			picked[q.ID] = q
		}
	}
	// Top up from any difficulty if we came short.
	if len(picked) < count {
		qs, _ := s.store.ListQuestions(ctx, tenantID, subjectID, "", count*2)
		for _, q := range qs {
			if len(picked) >= count {
				break
			}
			picked[q.ID] = q
		}
	}
	if len(picked) == 0 {
		return nil, nil, fmt.Errorf("no questions available for subject")
	}

	chosen := make([]domain.Question, 0, len(picked))
	for _, q := range picked {
		chosen = append(chosen, q)
	}
	sort.Slice(chosen, func(i, j int) bool { return chosen[i].ID < chosen[j].ID })
	if len(chosen) > count {
		chosen = chosen[:count]
	}

	ps := &domain.PracticeSet{TenantID: tenantID, StudentID: studentID, SubjectID: subjectID}
	if err := s.store.CreatePracticeSet(ctx, ps, chosen); err != nil {
		return nil, nil, err
	}
	return ps, stripAnswers(chosen), nil
}

// SubmitResult reports the grade of a finished practice set.
type SubmitResult struct {
	Score    float64                  `json:"score"`
	MaxScore float64                  `json:"max_score"`
	Percent  float64                  `json:"percent"`
	Details  []map[string]any         `json:"details"`
}

// SubmitPractice grades answers against the frozen snapshot. Correct→marks,
// wrong-but-answered→−negative (ai-cbt rule), unanswered→0.
func (s *Service) SubmitPractice(ctx context.Context, tenantID, setID string, answers map[string]string) (*SubmitResult, error) {
	ps, questions, err := s.store.GetPracticeSnapshot(ctx, tenantID, setID)
	if err != nil {
		return nil, err
	}
	var score, maxScore float64
	details := make([]map[string]any, 0, len(questions))
	for _, q := range questions {
		maxScore += q.Marks
		selected := strings.TrimSpace(answers[q.ID])
		correct := selected != "" && strings.EqualFold(selected, strings.TrimSpace(q.Answer))
		marks := 0.0
		switch {
		case correct:
			marks = q.Marks
		case selected != "":
			marks = -q.NegativeMarks
		}
		score += marks
		details = append(details, map[string]any{
			"question_id": q.ID, "selected": selected, "correct": correct,
			"answer": q.Answer, "marks": marks,
		})
	}
	percent := 0.0
	if maxScore > 0 {
		percent = score / maxScore * 100
		if percent < 0 {
			percent = 0
		}
	}
	if err := s.store.FinishPractice(ctx, ps, score, percent); err != nil {
		return nil, err
	}
	return &SubmitResult{Score: score, MaxScore: maxScore, Percent: percent, Details: details}, nil
}

// Chat answers a student's question, grounded in the subject's material via a
// simple lexical retrieval (pgvector-ready). Falls back to mock without a key.
func (s *Service) Chat(ctx context.Context, tenantID, studentID, subjectID, message string) (string, error) {
	context1 := s.retrieve(ctx, tenantID, subjectID, message, 3)
	if s.client.Enabled() {
		sys := "You are a kind, encouraging tutor for children. Use the provided material when relevant. Keep answers short and clear. Use LaTeX ($...$) for math."
		user := message
		if context1 != "" {
			user = "Material:\n" + context1 + "\n\nQuestion: " + message
		}
		out, usage, err := s.client.Chat(ctx, []ai.Message{
			{Role: "system", Content: sys},
			{Role: "user", Content: user},
		}, 0.3, 800)
		if err == nil {
			sid := studentID
			s.store.LogAIUsage(ctx, tenantID, &sid, "tutor_chat",
				usage.PromptTokens, usage.CompletionTokens, s.client.Model())
			return out, nil
		}
	}
	if context1 != "" {
		return "Here's something from your material that can help:\n\n" + context1 +
			"\n\nTry using that to answer — you've got this! 🙂", nil
	}
	return "Great question! Break it into small steps: what do you already know, and what is being asked? Give it a try and I'll help you check. 🙂", nil
}

// retrieve ranks subject chunks by word overlap with the query.
func (s *Service) retrieve(ctx context.Context, tenantID, subjectID, query string, k int) string {
	chunks, err := s.store.ChunksForSubject(ctx, tenantID, subjectID)
	if err != nil || len(chunks) == 0 {
		return ""
	}
	qWords := wordSet(query)
	type scored struct {
		text  string
		score int
	}
	ranked := make([]scored, 0, len(chunks))
	for _, c := range chunks {
		ranked = append(ranked, scored{text: c.Content, score: overlap(qWords, wordSet(c.Content))})
	}
	sort.Slice(ranked, func(i, j int) bool { return ranked[i].score > ranked[j].score })
	out := []string{}
	for i := 0; i < len(ranked) && i < k; i++ {
		if ranked[i].score == 0 {
			break
		}
		out = append(out, "• "+ranked[i].text)
	}
	return strings.Join(out, "\n")
}

func stripAnswers(qs []domain.Question) []domain.Question {
	out := make([]domain.Question, len(qs))
	for i, q := range qs {
		q.Answer = ""
		q.Explanation = ""
		out[i] = q
	}
	return out
}

func wordSet(s string) map[string]struct{} {
	set := map[string]struct{}{}
	for _, w := range strings.Fields(strings.ToLower(s)) {
		w = strings.Trim(w, ".,!?;:()$")
		if len(w) > 2 {
			set[w] = struct{}{}
		}
	}
	return set
}

func overlap(a, b map[string]struct{}) int {
	n := 0
	for w := range a {
		if _, ok := b[w]; ok {
			n++
		}
	}
	return n
}
