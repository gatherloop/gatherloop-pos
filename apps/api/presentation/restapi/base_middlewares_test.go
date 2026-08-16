package restapi_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"apps/api/presentation/restapi"

	"github.com/stretchr/testify/assert"
)

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

	// The request still reaches the handler (CORS is a browser-enforced
	// restriction, not a server-side block) but no browser will expose the
	// response body without these headers.
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
