package domain_test

import (
	"apps/api/domain"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerateTableCode(t *testing.T) {
	const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
	const excludedGlyphs = "ILOU"

	seen := map[string]bool{}

	for i := 0; i < 1000; i++ {
		code, err := domain.GenerateTableCode()

		assert.Nil(t, err)
		assert.Len(t, code, 10)

		for _, c := range code {
			assert.True(t, strings.ContainsRune(crockfordAlphabet, c), "code %q contains a character outside the Crockford alphabet", code)
			assert.False(t, strings.ContainsRune(excludedGlyphs, c), "code %q contains an excluded glyph", code)
		}

		// Collisions across 1000 draws from ~50 bits of entropy are
		// vanishingly unlikely; a repeat here signals a broken generator.
		assert.False(t, seen[code], "code %q was generated twice", code)
		seen[code] = true
	}
}
