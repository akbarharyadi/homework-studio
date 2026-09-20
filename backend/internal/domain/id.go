package domain

import (
	"crypto/rand"

	"github.com/oklog/ulid/v2"
)

// NewID returns a fresh lexicographically-sortable ULID as a 26-char string.
func NewID() string {
	return ulid.MustNew(ulid.Now(), rand.Reader).String()
}
