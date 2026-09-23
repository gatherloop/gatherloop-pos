package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeWhatsappNumber(t *testing.T) {
	tests := []struct {
		name       string
		raw        string
		expected   string
		expectsErr bool
	}{
		{name: "leading 0 becomes 62", raw: "0812-3456-7890", expected: "6281234567890"},
		{name: "628 prefix is unchanged", raw: "6281234567890", expected: "6281234567890"},
		{name: "+628 drops the plus", raw: "+62 812 3456 7890", expected: "6281234567890"},
		{name: "other country plus is dropped, kept if 8-15 digits", raw: "+6591234567", expected: "6591234567"},
		{name: "dots and parentheses are stripped", raw: "(0812).3456.7890", expected: "6281234567890"},
		{name: "too short to be a number", raw: "12345", expectsErr: true},
		{name: "letters are rejected", raw: "abc", expectsErr: true},
		{name: "empty string is rejected", raw: "", expectsErr: true},
		{name: "62 landline is rejected, not a mobile prefix", raw: "+62 21 555 1234", expectsErr: true},
		{name: "0 landline is rejected, not a mobile prefix", raw: "021-555-1234", expectsErr: true},
		{name: "62 number under 10 digits is rejected", raw: "62812345", expectsErr: true},
		{name: "62 number over 15 digits is rejected", raw: "6281234567890123", expectsErr: true},
		{name: "62 number at the 10 digit floor is accepted", raw: "6281234567", expected: "6281234567"},
		{name: "62 number at the 15 digit ceiling is accepted", raw: "628123456789012", expected: "628123456789012"},
		{name: "non-62 number under 8 digits is rejected", raw: "+1234567", expectsErr: true},
		{name: "non-62 number at the 8 digit floor is accepted", raw: "+12345678", expected: "12345678"},
		{name: "non-62 number at the 15 digit ceiling is accepted", raw: "+123456789012345", expected: "123456789012345"},
		{name: "non-62 number over 15 digits is rejected", raw: "+1234567890123456", expectsErr: true},
		{name: "bare plus sign is rejected", raw: "+", expectsErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			normalized, err := domain.NormalizeWhatsappNumber(tt.raw)

			if tt.expectsErr {
				assert.NotNil(t, err)
				assert.Equal(t, domain.BadRequest, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expected, normalized)
			}
		})
	}
}
