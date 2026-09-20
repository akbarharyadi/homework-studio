// Package config loads runtime configuration from environment / .env.
package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all backend settings.
type Config struct {
	AppName    string
	Env        string
	Port       string
	SecretKey  string
	TokenTTLMin int

	DatabaseURL string
	RedisURL    string

	StorageDir string

	// Primary AI provider (extraction fallback + tutor generation).
	AIProvider string
	AIKey      string
	AIBaseURL  string
	AIModel    string

	// Classifier provider — defaults to jev/TypeAI when configured.
	// Used to identify subject/worksheet type and sanity-check answers.
	ClassifierProvider string
	ClassifierKey      string
	ClassifierBaseURL  string
	ClassifierModel    string

	ReviewThreshold float64
	FrontendOrigin  string
}

// Load reads .env (if present) then the environment.
func Load() *Config {
	_ = godotenv.Load()

	c := &Config{
		AppName:     env("APP_NAME", "Homework Studio"),
		Env:         env("ENV", "development"),
		Port:        env("PORT", "8080"),
		SecretKey:   env("SECRET_KEY", "dev-secret-change-me"),
		TokenTTLMin: envInt("ACCESS_TOKEN_TTL_MINUTES", 720),

		DatabaseURL: env("DATABASE_URL", "postgres://homework:homework@localhost:5433/homework?sslmode=disable"),
		RedisURL:    env("REDIS_URL", ""),

		StorageDir: env("STORAGE_DIR", "./storage"),

		AIProvider: env("AI_PROVIDER", "mock"),
		AIKey:      env("AI_API_KEY", ""),
		AIBaseURL:  env("AI_BASE_URL", ""),
		AIModel:    env("AI_MODEL", ""),

		ClassifierProvider: env("CLASSIFIER_PROVIDER", "mock"),
		ClassifierKey:      env("CLASSIFIER_API_KEY", ""),
		ClassifierBaseURL:  env("CLASSIFIER_BASE_URL", "https://api.typeai.co/v1"),
		ClassifierModel:    env("CLASSIFIER_MODEL", "jev"),

		ReviewThreshold: envFloat("REVIEW_CONFIDENCE_THRESHOLD", 0.80),
		FrontendOrigin:  env("FRONTEND_ORIGIN", "http://localhost:3000"),
	}
	return c
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return def
}
