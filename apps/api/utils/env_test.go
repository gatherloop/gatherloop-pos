package utils_test

import (
	"testing"

	"apps/api/utils"

	"github.com/stretchr/testify/assert"
)

func TestGetEnv_CorsAllowedOrigins(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		expected []string
	}{
		{
			name:     "unset",
			raw:      "",
			expected: nil,
		},
		{
			name:     "single origin",
			raw:      "https://gatherloop.github.io",
			expected: []string{"https://gatherloop.github.io"},
		},
		{
			name:     "multiple origins, trims whitespace",
			raw:      "https://gatherloop.github.io, http://localhost:3000 ,http://localhost:5173",
			expected: []string{"https://gatherloop.github.io", "http://localhost:3000", "http://localhost:5173"},
		},
		{
			name:     "drops empty entries from stray commas",
			raw:      "https://gatherloop.github.io,,http://localhost:3000,",
			expected: []string{"https://gatherloop.github.io", "http://localhost:3000"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("CORS_ALLOWED_ORIGINS", tt.raw)

			env := utils.GetEnv()

			assert.Equal(t, tt.expected, env.CorsAllowedOrigins)
		})
	}
}
