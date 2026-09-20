// Package tutor implements the AI tutor: step-by-step explanations, a per-student
// practice generator, grading, and a RAG chat. Logic is adapted from ai-cbt
// (practice scoring, cached LaTeX explanations, stratified generation). It runs
// fully on the mock provider (no key) and upgrades to DeepSeek/GLM/TypeAI via env.
package tutor

import (
	"context"
	"encoding/json"
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

// GenerateExam produces `count` multiple-choice questions grounded in the teacher's
// uploaded material. GLM authors them (with a self-reported confidence) when a key
// is set; otherwise it samples the seeded bank for the subject. The returned
// questions are NOT yet persisted — the coursework pipeline attaches them to an exam.
func (s *Service) GenerateExam(ctx context.Context, tenantID, subjectID, subjectName, materialText string, count int) ([]domain.Question, error) {
	if count <= 0 {
		count = 8
	}
	if s.client.Enabled() {
		if qs, err := s.aiExamFromMaterial(ctx, tenantID, subjectName, materialText, count); err == nil && len(qs) > 0 {
			for i := range qs {
				qs[i].TenantID, qs[i].SubjectID = tenantID, subjectID
			}
			return qs, nil
		}
	}
	// Fallback (no key / error): draw from the seeded question bank for this subject.
	bank, _ := s.store.ListQuestions(ctx, tenantID, subjectID, "", count)
	out := make([]domain.Question, 0, len(bank))
	for _, q := range bank {
		q.ID, q.ExamID = "", nil // caller mints IDs + sets the exam
		q.AIGenerated, q.Approved, q.NeedsReview = true, false, false
		q.Confidence, q.Topic = 0.95, "From material"
		out = append(out, q)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no questions available for subject")
	}
	return out, nil
}

// GenerateNotes writes short teaching notes (a lesson summary) from the material.
// Falls back to a trimmed excerpt so it always returns something.
func (s *Service) GenerateNotes(ctx context.Context, tenantID, subjectName, materialText string) string {
	if s.client.Enabled() {
		material := clip(materialText, 6000)
		out, usage, err := s.client.Chat(ctx, []ai.Message{
			{Role: "system", Content: "You are a helpful teacher who writes concise, warm lesson notes."},
			{Role: "user", Content: fmt.Sprintf(
				"From this %s teaching material, write short notes the teacher can teach from: 3–6 key points and one worked example. Use Markdown, and $...$ for any math.\n\nMATERIAL:\n\"\"\"\n%s\n\"\"\"", subjectName, material)},
		}, 0.4, 900)
		if err == nil && strings.TrimSpace(out) != "" {
			s.store.LogAIUsage(ctx, tenantID, nil, "teaching_notes", usage.PromptTokens, usage.CompletionTokens, s.client.Model())
			return out
		}
	}
	excerpt := strings.TrimSpace(materialText)
	if excerpt == "" {
		return "_No readable text was extracted from this material._"
	}
	return "**Key points from this material**\n\n" + clip(excerpt, 400)
}

func clip(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// GenerateParentTip writes a short, warm "how to help at home" tip for a parent,
// from the child's strongest and weakest subjects. Falls back to a template.
func (s *Service) GenerateParentTip(ctx context.Context, tenantID, name, bestSubj, worstSubj string, bestAvg, worstAvg float64, hasData bool) string {
	if !hasData {
		return name + " is just getting started — cheer them on as they take their first exams! 🌟"
	}
	if s.client.Enabled() {
		prompt := fmt.Sprintf(
			"Write ONE short, warm, encouraging tip (max 2 sentences) for a parent to help their child %s at home. Strongest subject: %s (%.0f%%). Area to grow: %s (%.0f%%). Be specific and practical — no lists, no preamble.",
			name, bestSubj, bestAvg, worstSubj, worstAvg)
		out, usage, err := s.client.Chat(ctx, []ai.Message{
			{Role: "system", Content: "You write a single warm, practical sentence of advice to a parent about their child's learning."},
			{Role: "user", Content: prompt},
		}, 0.5, 200)
		if err == nil && strings.TrimSpace(out) != "" {
			s.store.LogAIUsage(ctx, tenantID, nil, "parent_tip", usage.PromptTokens, usage.CompletionTokens, s.client.Model())
			return strings.TrimSpace(out)
		}
	}
	if bestSubj == worstSubj {
		return fmt.Sprintf("%s is doing steadily in %s (%.0f%%). A little practice together each day keeps it up! 🌟", name, bestSubj, bestAvg)
	}
	return fmt.Sprintf("%s is strongest in %s (%.0f%%) — celebrate that! A fun 10 minutes of %s practice together would help the most.", name, bestSubj, bestAvg, worstSubj)
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
	s.store.SaveAttemptAnswers(ctx, setID, details) // persist per-question answers for review
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

// --- GLM-authored practice ---

type aiQuestion struct {
	Stem        string   `json:"stem"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
	Difficulty  string   `json:"difficulty"`
	Confidence  float64  `json:"confidence"`
}

// aiExamFromMaterial asks GLM to write exam questions grounded in the material, each
// with a self-reported confidence. Returns un-persisted questions (Approved=false,
// low-confidence ones flagged) for the coursework pipeline to attach to an exam.
func (s *Service) aiExamFromMaterial(ctx context.Context, tenantID, subjectName, materialText string, count int) ([]domain.Question, error) {
	prompt := fmt.Sprintf(`You are given TEACHING MATERIAL. Write %d multiple-choice %s questions that test the key ideas IN THIS MATERIAL, for a Grade 4 student (about 9-10 years old).
Return ONLY a JSON array, no prose or code fences, each item exactly:
{"stem":"...","options":["...","...","...","..."],"answer":"<must exactly match one option>","explanation":"one short line, use $...$ for any math","difficulty":"easy|medium|hard","confidence":0.0}
"confidence" is how well the question is grounded in the material and self-consistent (0.0-1.0).
Four options each. The answer MUST be one of the options verbatim.

MATERIAL:
"""
%s
"""`, count, subjectName, clip(materialText, 6000))

	out, usage, err := s.client.Chat(ctx, []ai.Message{
		{Role: "system", Content: "You are a warm primary-school teacher who writes clear exams grounded in the given material. Output strict JSON only."},
		{Role: "user", Content: prompt},
	}, 0.6, 2600)
	if err != nil {
		return nil, err
	}

	var raw []aiQuestion
	if err := parseJSONArray(out, &raw); err != nil {
		return nil, err
	}

	qs := make([]domain.Question, 0, count)
	for _, r := range raw {
		if strings.TrimSpace(r.Stem) == "" || len(r.Options) < 2 || strings.TrimSpace(r.Answer) == "" {
			continue
		}
		conf := r.Confidence
		if conf <= 0 {
			conf = 0.7
		}
		if conf > 1 {
			conf = 1
		}
		inOpts := false
		for _, o := range r.Options {
			if strings.EqualFold(strings.TrimSpace(o), strings.TrimSpace(r.Answer)) {
				inOpts = true
				break
			}
		}
		qs = append(qs, domain.Question{
			Topic: "From material", Difficulty: normDifficulty(r.Difficulty),
			Stem: r.Stem, Options: r.Options, Answer: r.Answer, Explanation: r.Explanation,
			Marks: 1, AIGenerated: true, Approved: false,
			Confidence: conf, NeedsReview: conf < 0.80 || !inOpts,
		})
		if len(qs) >= count {
			break
		}
	}
	if len(qs) == 0 {
		return nil, fmt.Errorf("no valid AI questions")
	}
	s.store.LogAIUsage(ctx, tenantID, nil, "exam_generation", usage.PromptTokens, usage.CompletionTokens, s.client.Model())
	return qs, nil
}

func normDifficulty(d string) string {
	switch strings.ToLower(strings.TrimSpace(d)) {
	case "easy":
		return domain.DiffEasy
	case "hard":
		return domain.DiffHard
	default:
		return domain.DiffMedium
	}
}

// parseJSONArray tolerates models that wrap a JSON array in prose or ```json fences.
func parseJSONArray(raw string, v any) error {
	s := strings.TrimSpace(raw)
	if i := strings.Index(s, "["); i >= 0 {
		if j := strings.LastIndex(s, "]"); j >= i {
			s = s[i : j+1]
		}
	}
	return json.Unmarshal([]byte(s), v)
}
