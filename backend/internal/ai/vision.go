package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
)

// Multimodal (vision) chat, OpenAI-compatible. Works with GLM vision models
// (e.g. a GLM flash vision model), Qwen-VL, GPT-4o, etc. — same request shape.

type contentPart struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *imageURL `json:"image_url,omitempty"`
}

type imageURL struct {
	URL string `json:"url"`
}

type visionMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"` // string, or []contentPart for the image turn
}

type visionRequest struct {
	Model       string          `json:"model"`
	Messages    []visionMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
}

// ChatVision sends a system prompt + a user turn that carries text and one image
// (as a data URL), returning the assistant text and token usage.
func (c *Client) ChatVision(ctx context.Context, system, user, imageDataURL string, temperature float64, maxTokens int) (string, Usage, error) {
	if !c.Enabled() {
		return "", Usage{}, ErrDisabled
	}
	reqBody := visionRequest{
		Model:       c.model,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Messages: []visionMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: []contentPart{
				{Type: "text", Text: user},
				{Type: "image_url", ImageURL: &imageURL{URL: imageDataURL}},
			}},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", Usage{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", Usage{}, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", Usage{}, fmt.Errorf("vision http %d: %s", resp.StatusCode, string(raw))
	}
	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", Usage{}, err
	}
	if len(parsed.Choices) == 0 {
		return "", parsed.Usage, errors.New("vision: empty choices")
	}
	return parsed.Choices[0].Message.Content, parsed.Usage, nil
}
