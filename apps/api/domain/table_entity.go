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

const tableCodeAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

const tableCodeLength = 10

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
