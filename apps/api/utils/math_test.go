package utils_test

import (
	"fmt"
	"testing"

	"apps/api/utils"

	"github.com/stretchr/testify/assert"
)

func TestRoundToNearest500(t *testing.T) {
	tests := []struct {
		input    int
		expected int
	}{
		// Zero
		{input: 0, expected: 0},
		// Below midpoint of first interval — rounds down to 0
		{input: 249, expected: 0},
		// Exactly at midpoint (250) — standard round-half-to-even: rounds up to 500
		{input: 250, expected: 500},
		// Just above midpoint — rounds up to 500
		{input: 251, expected: 500},
		// Exactly 500
		{input: 500, expected: 500},
		// Below midpoint of 500–1000 interval — rounds down to 500
		{input: 749, expected: 500},
		// Exactly at midpoint (750) — rounds up to 1000
		{input: 750, expected: 1000},
		// Just above midpoint of 500–1000 interval — rounds up to 1000
		{input: 751, expected: 1000},
		// Exactly 1000
		{input: 1000, expected: 1000},
		// Large value — 10%  of 20000 with percentage coupon
		{input: 2000, expected: 2000},
		{input: 15000, expected: 15000},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("input=%d_expected=%d", tt.input, tt.expected), func(t *testing.T) {
			result := utils.RoundToNearest500(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
