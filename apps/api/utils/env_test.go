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

func TestGetEnv_DokuQrisExpirySeconds(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		expected int
	}{
		{name: "unset defaults to 300", raw: "", expected: 300},
		{name: "explicit value", raw: "120", expected: 120},
		{name: "non-numeric falls back to default", raw: "not-a-number", expected: 300},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("DOKU_QRIS_EXPIRY_SECONDS", tt.raw)

			env := utils.GetEnv()

			assert.Equal(t, tt.expected, env.DokuQrisExpirySeconds)
		})
	}
}

func TestGetEnv_DokuConfig(t *testing.T) {
	t.Setenv("DOKU_BASE_URL", "https://api-sandbox.doku.com")
	t.Setenv("DOKU_CLIENT_ID", "client-id")
	t.Setenv("DOKU_CLIENT_SECRET", "client-secret")
	t.Setenv("DOKU_PRIVATE_KEY", "pem")
	t.Setenv("DOKU_MERCHANT_ID", "merchant-id")
	t.Setenv("DOKU_CHANNEL_ID", "channel-id")
	t.Setenv("DOKU_TERMINAL_ID", "terminal-id")
	t.Setenv("DOKU_MERCHANT_POSTAL_CODE", "12190")
	t.Setenv("DOKU_QRIS_FEE_TYPE", "1")
	t.Setenv("ORDER_PAYMENT_WALLET_ID", "42")

	env := utils.GetEnv()

	assert.Equal(t, "https://api-sandbox.doku.com", env.DokuBaseURL)
	assert.Equal(t, "client-id", env.DokuClientId)
	assert.Equal(t, "client-secret", env.DokuClientSecret)
	assert.Equal(t, "pem", env.DokuPrivateKey)
	assert.Equal(t, "merchant-id", env.DokuMerchantId)
	assert.Equal(t, "channel-id", env.DokuChannelId)
	assert.Equal(t, "terminal-id", env.DokuTerminalId)
	assert.Equal(t, "12190", env.DokuPostalCode)
	assert.Equal(t, "1", env.DokuFeeType)
	assert.Equal(t, "42", env.OrderPaymentWalletId)
}

func TestGetEnv_DokuCredentialsAreTrimmedAndUnquoted(t *testing.T) {
	t.Setenv("DOKU_BASE_URL", " https://api-sandbox.doku.com\n")
	t.Setenv("DOKU_CLIENT_ID", `"BRN-0221-1234567890"`)
	t.Setenv("DOKU_CLIENT_SECRET", "  client-secret  ")
	t.Setenv("DOKU_MERCHANT_ID", "'merchant-id'")
	t.Setenv("DOKU_CHANNEL_ID", "channel-id\r")
	t.Setenv("DOKU_TERMINAL_ID", ` "terminal-id" `)

	env := utils.GetEnv()

	assert.Equal(t, "https://api-sandbox.doku.com", env.DokuBaseURL)
	assert.Equal(t, "BRN-0221-1234567890", env.DokuClientId)
	assert.Equal(t, "client-secret", env.DokuClientSecret)
	assert.Equal(t, "merchant-id", env.DokuMerchantId)
	assert.Equal(t, "channel-id", env.DokuChannelId)
	assert.Equal(t, "terminal-id", env.DokuTerminalId)
}
