// Package ai is a tiny OpenAI-compatible chat client. One shape serves DeepSeek,
// Zhipu GLM, TypeAI (jev), and OpenAI — you only change base URL / key / model.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

// Client talks to one OpenAI-compatible endpoint. A zero/blank key means the
// client is "disabled" and Chat returns ErrDisabled (callers fall back to mock).
type Client struct {
	http    *http.Client
	baseURL string
	apiKey  string
	model   string
}

var ErrDisabled = errors.New("ai client not configured (using mock)")

func New(baseURL, apiKey, model string) *Client {
	return &Client{
		http:    &http.Client{Timeout: 60 * time.Second},
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
	}
}

// Enabled reports whether a real endpoint is configured.
func (c *Client) Enabled() bool { return c.apiKey != "" && c.baseURL != "" }

func (c *Client) Model() string { return c.model }

type chatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
	Usage Usage `json:"usage"`
}

// Chat sends messages and returns the assistant text + token usage.
func (c *Client) Chat(ctx context.Context, messages []Message, temperature float64, maxTokens int) (string, Usage, error) {
	if !c.Enabled() {
		return "", Usage{}, ErrDisabled
	}
	body, _ := json.Marshal(chatRequest{
		Model: c.model, Messages: messages, Temperature: temperature, MaxTokens: maxTokens,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/chat/completions", bytes.NewReader(body))
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
		return "", Usage{}, fmt.Errorf("ai http %d: %s", resp.StatusCode, string(raw))
	}
	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", Usage{}, err
	}
	if len(parsed.Choices) == 0 {
		return "", parsed.Usage, errors.New("ai: empty choices")
	}
	return parsed.Choices[0].Message.Content, parsed.Usage, nil
}
