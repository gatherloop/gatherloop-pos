package domain_test

import (
	"apps/api/domain"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTokenizeSearchQuery(t *testing.T) {
	nineWords := "one two three four five six seven eight nine"
	hundredTwentyChars := strings.Repeat("a", 120)

	tests := []struct {
		name     string
		query    string
		expected []string
	}{
		{name: "empty", query: "", expected: []string{}},
		{name: "whitespace only", query: "   \t  ", expected: []string{}},
		{name: "single word", query: "besar", expected: []string{"besar"}},
		{name: "multiple words", query: "earl grey", expected: []string{"earl", "grey"}},
		{name: "more than 8 tokens is capped at 8", query: nineWords, expected: []string{"one", "two", "three", "four", "five", "six", "seven", "eight"}},
		{name: "longer than 100 chars is truncated", query: hundredTwentyChars, expected: []string{strings.Repeat("a", 100)}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, domain.TokenizeSearchQuery(tt.query))
		})
	}
}
