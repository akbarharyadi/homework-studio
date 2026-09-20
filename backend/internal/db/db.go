// Package db wires the pgx connection pool and applies SQL migrations at startup.
package db

import (
	"context"
	"embed"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// New opens a pgx pool and pings it (with a short retry so it survives a
// container start race with Postgres).
func New(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	cfg.MaxConns = 10

	var pool *pgxpool.Pool
	for attempt := 1; attempt <= 10; attempt++ {
		pool, err = pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				return pool, nil
			} else {
				err = pingErr
				pool.Close()
			}
		}
		time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
	}
	return nil, fmt.Errorf("connect postgres after retries: %w", err)
}

// Migrate applies every embedded migration in lexical order. Migrations use
// CREATE TABLE IF NOT EXISTS, so re-running is safe (idempotent for the demo).
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := migrationFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		body, readErr := migrationFS.ReadFile("migrations/" + name)
		if readErr != nil {
			return readErr
		}
		if _, execErr := pool.Exec(ctx, string(body)); execErr != nil {
			return fmt.Errorf("apply %s: %w", name, execErr)
		}
	}
	return nil
}
