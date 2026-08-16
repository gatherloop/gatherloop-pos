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
