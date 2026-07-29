package restapi

import (
	"apps/api/pkg/buildinfo"
	"encoding/json"
	"net/http"
	"time"
)

type HealthResponse struct {
	Status        string `json:"status"`
	Version       string `json:"version"`
	Commit        string `json:"commit"`
	UptimeSeconds int64  `json:"uptime_seconds"`
}

type HealthHandler struct {
	startTime time.Time
}

func NewHealthHandler(startTime time.Time) *HealthHandler {
	return &HealthHandler{startTime: startTime}
}

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(HealthResponse{
		Status:        "ok",
		Version:       buildinfo.Version,
		Commit:        buildinfo.Version,
		UptimeSeconds: int64(time.Since(h.startTime).Seconds()),
	})
}
