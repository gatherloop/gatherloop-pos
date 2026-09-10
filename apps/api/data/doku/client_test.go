package doku

import (
	"apps/api/domain"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testLogger discards output — tests assert on behaviour, not on log lines.
func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// decodeJSON reads and decodes a request body, for tests that assert on
// what this package actually sent DOKU.
func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func TestParsePrivateKeyPEM_PKCS8(t *testing.T) {
	key, err := ParsePrivateKeyPEM(testPrivateKeyPEM)

	require.NoError(t, err)
	assert.NotNil(t, key)
}

func TestParsePrivateKeyPEM_InvalidPEM(t *testing.T) {
	_, err := ParsePrivateKeyPEM("not a pem")
	assert.Error(t, err)
}

func TestParsePrivateKeyPEM_NotAKey(t *testing.T) {
	// A validly PEM-armored block that isn't a private key at all.
	_, err := ParsePrivateKeyPEM("-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----")
	assert.Error(t, err)
}

func TestFormatTimestamp_ParsesBackAsRFC3339Nano(t *testing.T) {
	now := time.Date(2021, 1, 8, 9, 57, 39, 877000000, time.FixedZone("WIB", 7*60*60))

	formatted := formatTimestamp(now)

	parsed, err := time.Parse(time.RFC3339Nano, formatted)
	require.NoError(t, err)
	assert.True(t, now.Equal(parsed))
}

func TestFormatAmount(t *testing.T) {
	assert.Equal(t, "10000.00", formatAmount(10000))
	assert.Equal(t, "1500.50", formatAmount(1500.5))
}

func TestIsSuccessResponseCode(t *testing.T) {
	assert.True(t, isSuccessResponseCode("2004700"))
	assert.True(t, isSuccessResponseCode("2005500"))
	assert.False(t, isSuccessResponseCode("4004701"))
	assert.False(t, isSuccessResponseCode("5004701"))
	assert.False(t, isSuccessResponseCode(""))
}

func TestMapTransactionStatus(t *testing.T) {
	tests := []struct {
		code     string
		expected domain.PaymentGatewayStatus
	}{
		{"00", domain.PaymentGatewayStatusPaid},
		{"05", domain.PaymentGatewayStatusExpired},
		{"06", domain.PaymentGatewayStatusFailed},
		{"07", domain.PaymentGatewayStatusFailed},
		{"01", domain.PaymentGatewayStatusPending},
		{"unknown-code", domain.PaymentGatewayStatusPending},
		{"", domain.PaymentGatewayStatusPending},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			assert.Equal(t, tt.expected, mapTransactionStatus(tt.code))
		})
	}
}

func TestGenerateExternalId_UniqueAndNumeric(t *testing.T) {
	a := generateExternalId()
	b := generateExternalId()

	assert.NotEqual(t, a, b)
	for _, r := range a {
		assert.True(t, r >= '0' && r <= '9', "external id must be numeric")
	}
}

func TestDoSignedRequest_RetriesOnceOn401(t *testing.T) {
	tokenRequests := 0
	callRequests := 0
	sawUnauthorizedOnce := false

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case tokenPath:
			tokenRequests++
			writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
		case qrGeneratePath:
			callRequests++
			if !sawUnauthorizedOnce {
				sawUnauthorizedOnce = true
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			writeJSON(w, generateQrisResponse{ResponseCode: "2004700", ReferenceNo: "REF1", PartnerReferenceNo: "ORD1", QrContent: "qr-content"})
		}
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	payment, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.Nil(t, err)
	assert.Equal(t, "qr-content", payment.QrContent)
	assert.Equal(t, 2, callRequests, "the generate call must be retried exactly once after a 401")
	assert.Equal(t, 2, tokenRequests, "a 401 must invalidate the cached token and force a re-fetch")
}

func TestDoSignedRequest_NonRetryableFailureIsNotRetried(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case tokenPath:
			writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
		case qrGeneratePath:
			requests++
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.NotNil(t, err)
	assert.Equal(t, 1, requests)
}
