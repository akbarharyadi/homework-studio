package vision

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"homework-studio/internal/ai"
)

// NewExtractor returns the real GLM/vision extractor when a vision client is
// configured, otherwise the deterministic mock. The vision extractor falls back
// to mock for non-image files (e.g. PDFs need rasterization) and on any error,
// so the demo never breaks.
func NewExtractor(provider string, client *ai.Client) Extractor {
	if provider != "mock" && client != nil && client.Enabled() {
		return &LLMVisionExtractor{client: client, fallback: MockExtractor{}}
	}
	return MockExtractor{}
}

// LLMVisionExtractor reads a homework photo with a vision model (GLM, Qwen-VL,
// GPT-4o, …) and returns each answer with a model-reported confidence.
type LLMVisionExtractor struct {
	client   *ai.Client
	fallback Extractor
}

func (e *LLMVisionExtractor) Name() string { return "vision/" + e.client.Model() }

const visionSystem = "You are a careful teaching assistant. You read a photo of a child's math or science homework and report exactly what the student wrote."

const visionUser = `Read the worksheet in the image. For each question extract:
- question_text: the question as printed
- student_answer: what the student actually wrote (their answer, even if wrong)
- correct_answer: the correct answer (compute it for math; the accepted answer for science)
- confidence: 0.0-1.0, how sure you are you read the student's handwriting correctly

Also identify the overall subject.
Return ONLY strict JSON, no prose or code fences, in exactly this shape:
{"subject":"Math","items":[{"question_no":1,"question_text":"...","student_answer":"...","correct_answer":"...","confidence":0.0}]}
If an answer is unreadable, still include it with a low confidence.`

type visionResult struct {
	Subject string `json:"subject"`
	Items   []struct {
		QuestionNo    int     `json:"question_no"`
		QuestionText  string  `json:"question_text"`
		StudentAnswer string  `json:"student_answer"`
		CorrectAnswer string  `json:"correct_answer"`
		Confidence    float64 `json:"confidence"`
	} `json:"items"`
}

func (e *LLMVisionExtractor) Extract(ctx context.Context, in ExtractInput) (ExtractOutput, error) {
	imgData, imgMime := in.Data, ""
	if mime, ok := imageMime(in.Filename); ok {
		imgMime = mime
	} else if strings.HasSuffix(strings.ToLower(in.Filename), ".pdf") {
		// Rasterize the first page (poppler) and read it as an image.
		png, err := rasterizePDF(ctx, in.Data)
		if err != nil {
			return e.fallback.Extract(ctx, in) // no poppler / bad PDF -> mock
		}
		imgData, imgMime = png, "image/png"
	} else {
		return e.fallback.Extract(ctx, in)
	}

	dataURL := "data:" + imgMime + ";base64," + base64.StdEncoding.EncodeToString(imgData)
	raw, _, err := e.client.ChatVision(ctx, visionSystem, visionUser, dataURL, 0.1, 2048)
	if err != nil {
		return e.fallback.Extract(ctx, in)
	}

	parsed, perr := parseVisionJSON(raw)
	if perr != nil || len(parsed.Items) == 0 {
		return e.fallback.Extract(ctx, in)
	}

	items := make([]ExtractedItem, 0, len(parsed.Items))
	for i, it := range parsed.Items {
		no := it.QuestionNo
		if no == 0 {
			no = i + 1
		}
		conf := it.Confidence
		if conf <= 0 {
			conf = 0.5
		}
		if conf > 1 {
			conf = 1
		}
		items = append(items, ExtractedItem{
			QuestionNo:    no,
			QuestionText:  it.QuestionText,
			StudentAnswer: it.StudentAnswer,
			CorrectAnswer: it.CorrectAnswer,
			Confidence:    conf,
		})
	}
	return ExtractOutput{Items: items, DetectedSubject: parsed.Subject, SubjectConfidence: 0.92}, nil
}

func imageMime(filename string) (string, bool) {
	f := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(f, ".png"):
		return "image/png", true
	case strings.HasSuffix(f, ".jpg"), strings.HasSuffix(f, ".jpeg"):
		return "image/jpeg", true
	case strings.HasSuffix(f, ".webp"):
		return "image/webp", true
	default:
		return "", false
	}
}

// parseVisionJSON tolerates models that wrap JSON in ```json fences or add prose.
func parseVisionJSON(raw string) (visionResult, error) {
	s := strings.TrimSpace(raw)
	if i := strings.Index(s, "{"); i >= 0 {
		if j := strings.LastIndex(s, "}"); j >= i {
			s = s[i : j+1]
		}
	}
	var vr visionResult
	if err := json.Unmarshal([]byte(s), &vr); err != nil {
		return vr, fmt.Errorf("parse vision json: %w", err)
	}
	return vr, nil
}

// rasterizePDF renders a PDF's first page to PNG via poppler's `pdftoppm`.
// Returns an error if poppler is not installed or the PDF is invalid, in which
// case the caller falls back to the mock reader.
func rasterizePDF(ctx context.Context, data []byte) ([]byte, error) {
	if _, err := exec.LookPath("pdftoppm"); err != nil {
		return nil, err
	}
	dir, err := os.MkdirTemp("", "hw-pdf-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	inPath := filepath.Join(dir, "in.pdf")
	if err := os.WriteFile(inPath, data, 0o600); err != nil {
		return nil, err
	}
	outPrefix := filepath.Join(dir, "page")
	cmd := exec.CommandContext(ctx, "pdftoppm",
		"-png", "-r", "150", "-f", "1", "-l", "1", "-singlefile", inPath, outPrefix)
	if err := cmd.Run(); err != nil {
		return nil, err
	}
	return os.ReadFile(outPrefix + ".png")
}
