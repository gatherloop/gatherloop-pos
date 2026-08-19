package domain

import (
	"crypto/rand"
	"time"
)

type Table struct {
	Id          int64
	Code        string
	Label       string
	FloorNumber int
	CreatedAt   time.Time
	DeletedAt   *time.Time
}

// tableCodeAlphabet is Crockford base32 (0-9A-Z) with I, L, O and U dropped
// (D6) — the four glyphs guests most often misread on a printed QR sticker.
// Its length (32) evenly divides 256, so mapping a random byte onto it with
// modulo introduces no bias.
const tableCodeAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

// tableCodeLength yields ~50 bits of entropy (log2(32) * 10), enough that a
// code cannot be guessed but short enough to stay transcribable (D6).
const tableCodeLength = 10

// GenerateTableCode mints a non-guessable table code with crypto/rand. Never
// derive a code from the label — that would make it guessable.
func GenerateTableCode() (string, error) {
	randomBytes := make([]byte, tableCodeLength)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	code := make([]byte, tableCodeLength)
	for i, b := range randomBytes {
		code[i] = tableCodeAlphabet[int(b)%len(tableCodeAlphabet)]
	}

	return string(code), nil
}
