package domain

import "strings"

const (
	MaxSearchQueryTokens = 8
	MaxSearchQueryLength = 100
)

// Runes, not bytes, so truncation never splits a multi-byte character.
func TokenizeSearchQuery(query string) []string {
	if runes := []rune(query); len(runes) > MaxSearchQueryLength {
		query = string(runes[:MaxSearchQueryLength])
	}

	tokens := strings.Fields(query)
	if len(tokens) > MaxSearchQueryTokens {
		tokens = tokens[:MaxSearchQueryTokens]
	}

	return tokens
}
