package logger

import (
	"crypto/rand"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

const correlationIDHeader = "X-Correlation-ID"

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// newUUID generates a random UUID v4 string using crypto/rand.
func newUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant bits
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// RequestLogger returns a middleware that:
//   - Reads or generates a correlation_id
//   - Injects a request-scoped logger (enriched with correlation_id, method, path, remote_addr) into ctx
//   - Logs request start at INFO
//   - Logs request completion at INFO (with status and latency_ms)
//   - Returns the correlation_id to the client via X-Correlation-ID response header
func RequestLogger(root *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			correlationID := r.Header.Get(correlationIDHeader)
			if correlationID == "" {
				correlationID = r.Header.Get("X-Request-ID")
			}
			if correlationID == "" {
				correlationID = newUUID()
			}

			reqLogger := root.With(
				slog.String("correlation_id", correlationID),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("remote_addr", r.RemoteAddr),
			)

			ctx := WithCtx(r.Context(), reqLogger)
			r = r.WithContext(ctx)

			w.Header().Set(correlationIDHeader, correlationID)

			reqLogger.InfoContext(ctx, "request received")

			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(rw, r)

			reqLogger.InfoContext(ctx, "request completed",
				slog.Int("status", rw.statusCode),
				slog.Int64("latency_ms", time.Since(start).Milliseconds()),
			)
		})
	}
}
