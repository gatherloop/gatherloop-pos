package restapi_test

import (
	"apps/api/pkg/buildinfo"
	"apps/api/presentation/restapi"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestHealthHandler_HealthCheck(t *testing.T) {
	startTime := time.Now().Add(-5 * time.Second)
	handler := restapi.NewHealthHandler(startTime)

	req := httptest.NewRequest(http.MethodGet, "/health-check", nil)
	w := httptest.NewRecorder()
	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var body restapi.HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &body)
	assert.NoError(t, err)
	assert.Equal(t, "ok", body.Status)
	assert.Equal(t, buildinfo.Version, body.Version)
	assert.Equal(t, buildinfo.Version, body.Commit)
	assert.GreaterOrEqual(t, body.UptimeSeconds, int64(5))
}
