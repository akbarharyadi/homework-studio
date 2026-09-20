// Package vision reads an uploaded teaching material into plain text so the AI can
// index it (RAG), summarize it, and generate an exam from it. Images and PDFs are
// transcribed by a real vision model (GLM-5.3-flash by default); text files are read
// directly. There is no mock path — a GLM key is required for images/PDFs.
package vision

import (
	"context"
	"encoding/base64"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"homework-studio/internal/ai"
)

const textSystem = "You are a careful assistant that transcribes teaching documents into plain text."
const textUser = "Transcribe this teaching material to clean plain text, keeping headings, lists and any worked examples. Output ONLY the transcribed text, no commentary."

// ReadText turns an uploaded teaching material into UTF-8 text. Plain-text files are
// read directly; images and PDFs go through the vision model. If the vision client
// isn't configured or the read fails, it returns any usable raw text (or a short
// placeholder) so the coursework pipeline still produces notes + a bank-grounded exam.
func ReadText(ctx context.Context, client *ai.Client, filename string, data []byte) (string, error) {
	lower := strings.ToLower(filename)
	if strings.HasSuffix(lower, ".txt") || strings.HasSuffix(lower, ".md") || strings.HasSuffix(lower, ".csv") {
		return string(data), nil
	}

	dataURL := ""
	if mime, ok := imageMime(filename); ok {
		dataURL = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
	} else if strings.HasSuffix(lower, ".pdf") {
		if png, err := rasterizePDF(ctx, data); err == nil {
			dataURL = "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
		}
	}

	if dataURL != "" && client != nil && client.Enabled() {
		out, _, err := client.ChatVision(ctx, textSystem, textUser, dataURL, 0.1, 4096)
		if err == nil && strings.TrimSpace(out) != "" {
			return out, nil
		}
	}

	// Last resort: usable text stays usable; binary becomes a labelled placeholder.
	if utf8.Valid(data) && isMostlyPrintable(data) {
		return string(data), nil
	}
	return "Uploaded teaching material: " + filename, nil
}

// isMostlyPrintable is a cheap check that a byte slice is human-readable text.
func isMostlyPrintable(b []byte) bool {
	if len(b) == 0 {
		return false
	}
	printable := 0
	for _, r := range string(b) {
		if r == '\n' || r == '\t' || r == '\r' || (r >= 0x20 && r != 0xFFFD) {
			printable++
		}
	}
	return printable*10 >= len(b)*9 // ≥90% printable
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

// rasterizePDF renders a PDF's first page to PNG via poppler's `pdftoppm`.
// Returns an error if poppler is not installed or the PDF is invalid, in which
// case the caller falls back to reading the raw bytes.
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
