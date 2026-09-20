// Package store is the data-access layer: plain SQL over a pgx pool (no ORM).
package store

import (
	"errors"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a lookup matches no row.
var ErrNotFound = errors.New("not found")

// Store wraps the connection pool. Methods live in the sibling files
// (users.go, homeworks.go, review.go, dashboard.go, tutor.go).
type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Pool exposes the underlying pool for the seed command / transactions.
func (s *Store) Pool() *pgxpool.Pool { return s.pool }

// noRows maps pgx.ErrNoRows to our ErrNotFound.
func noRows(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// itoa is a tiny helper for building positional placeholders ($1, $2, ...).
func itoa(n int) string { return strconv.Itoa(n) }
