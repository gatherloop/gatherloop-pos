package restapi_test

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"apps/api/presentation/restapi"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func computeDokuSymmetricSignature(t *testing.T, secret, method, path, timestamp string, body []byte) string {
	t.Helper()

	var compact bytes.Buffer
	require.NoError(t, json.Compact(&compact, body))

	digest := sha256.Sum256(compact.Bytes())
	digestHex := strings.ToLower(hex.EncodeToString(digest[:]))

	stringToSign := method + ":" + path + ":" + ":" + digestHex + ":" + timestamp
	mac := hmac.New(sha512.New, []byte(secret))
	mac.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func TestEnableCORS_AllowsOriginInAllowlist(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://gatherloop.github.io,http://localhost:3000")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/public/categories", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	restapi.EnableCORS(next).ServeHTTP(w, req)

	assert.True(t, nextCalled)
	assert.Equal(t, "http://localhost:3000", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
}

func TestEnableCORS_RejectsOriginNotInAllowlist(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://gatherloop.github.io,http://localhost:3000")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/public/categories", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	w := httptest.NewRecorder()

	restapi.EnableCORS(next).ServeHTTP(w, req)

	assert.True(t, nextCalled)
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Credentials"))
}

func TestEnableCORS_NoOriginHeader(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://gatherloop.github.io")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/public/categories", nil)
	w := httptest.NewRecorder()

	restapi.EnableCORS(next).ServeHTTP(w, req)

	assert.True(t, nextCalled)
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Credentials"))
}

func TestEnableCORS_PreflightOptionsRequest(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
	})

	req := httptest.NewRequest(http.MethodOptions, "/public/categories", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	restapi.EnableCORS(next).ServeHTTP(w, req)

	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "http://localhost:3000", w.Header().Get("Access-Control-Allow-Origin"))
	assert.NotEmpty(t, w.Header().Get("Access-Control-Allow-Methods"))
	assert.NotEmpty(t, w.Header().Get("Access-Control-Allow-Headers"))
}

func TestRequireSessionId(t *testing.T) {
	tests := []struct {
		name           string
		sessionId      string
		expectedStatus int
	}{
		{
			name:           "valid UUIDv4 passes through",
			sessionId:      "3fa85f64-5717-4562-b3fc-2c963f66afa6",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "missing header is rejected",
			sessionId:      "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "malformed header is rejected",
			sessionId:      "not-a-uuid",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "non-v4 uuid is rejected",
			sessionId:      "3fa85f64-5717-1562-b3fc-2c963f66afa6",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/carts/current", nil)
			if tt.sessionId != "" {
				req.Header.Set("X-Session-Id", tt.sessionId)
			}
			w := httptest.NewRecorder()

			restapi.RequireSessionId(next).ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Equal(t, tt.expectedStatus == http.StatusOK, nextCalled)
		})
	}
}

func TestVerifyDokuSignature_ValidSignaturePassesThroughWithBodyIntact(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	method := http.MethodPost
	path := "/payments/doku/notification"
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)
	timestamp := time.Now().Format("2006-01-02T15:04:05.000Z07:00")
	signature := computeDokuSymmetricSignature(t, "test-client-secret", method, path, timestamp, body)

	var bodyInHandler []byte
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		bodyInHandler, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.True(t, nextCalled)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, string(body), string(bodyInHandler))
}

func TestVerifyDokuSignature_InvalidSignatureIsRejected(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
	})

	req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewBufferString(`{"originalPartnerReferenceNo":"ORD1"}`))
	req.Header.Set("X-TIMESTAMP", time.Now().Format("2006-01-02T15:04:05.000Z07:00"))
	req.Header.Set("X-SIGNATURE", "dGFtcGVyZWQtc2lnbmF0dXJl")
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestVerifyDokuSignature_TamperedBodyIsRejected(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	method := http.MethodPost
	path := "/payments/doku/notification"
	originalBody := []byte(`{"originalPartnerReferenceNo":"ORD1","amount":{"value":"10000.00","currency":"IDR"}}`)
	timestamp := time.Now().Format("2006-01-02T15:04:05.000Z07:00")
	signature := computeDokuSymmetricSignature(t, "test-client-secret", method, path, timestamp, originalBody)

	tamperedBody := []byte(`{"originalPartnerReferenceNo":"ORD1","amount":{"value":"999999.00","currency":"IDR"}}`)

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { nextCalled = true })

	req := httptest.NewRequest(method, path, bytes.NewReader(tamperedBody))
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestVerifyDokuSignature_MissingTimestampIsRejected(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { nextCalled = true })

	req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewBufferString(`{"originalPartnerReferenceNo":"ORD1"}`))
	req.Header.Set("X-SIGNATURE", "anything")
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestVerifyDokuSignature_MalformedTimestampIsRejected(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { nextCalled = true })

	req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewBufferString(`{"originalPartnerReferenceNo":"ORD1"}`))
	req.Header.Set("X-TIMESTAMP", "not-a-timestamp")
	req.Header.Set("X-SIGNATURE", "anything")
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestVerifyDokuSignature_ClockSkewIsRejected(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	method := http.MethodPost
	path := "/payments/doku/notification"
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)
	staleTimestamp := time.Now().Add(-10 * time.Minute).Format("2006-01-02T15:04:05.000Z07:00")
	signature := computeDokuSymmetricSignature(t, "test-client-secret", method, path, staleTimestamp, body)

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { nextCalled = true })

	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("X-TIMESTAMP", staleTimestamp)
	req.Header.Set("X-SIGNATURE", signature)
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestVerifyDokuSignature_WithinSkewWindowIsAccepted(t *testing.T) {
	t.Setenv("DOKU_CLIENT_SECRET", "test-client-secret")

	method := http.MethodPost
	path := "/payments/doku/notification"
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)
	timestamp := time.Now().Add(-4*time.Minute - 30*time.Second).Format("2006-01-02T15:04:05.000Z07:00")
	signature := computeDokuSymmetricSignature(t, "test-client-secret", method, path, timestamp, body)

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)
	w := httptest.NewRecorder()

	restapi.VerifyDokuSignature(next).ServeHTTP(w, req)

	assert.True(t, nextCalled)
	assert.Equal(t, http.StatusOK, w.Code)
}
