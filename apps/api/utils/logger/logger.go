package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

type contextKey struct{}

// New creates a root *slog.Logger backed by a JSON handler writing to stdout.
// It reads LOG_LEVEL, SERVICE_NAME, and APP_ENV from the provided config values.
func New(serviceName, appEnv, logLevel string) *slog.Logger {
	level := parseLevel(logLevel)

	opts := &slog.HandlerOptions{Level: level}
	handler := slog.NewJSONHandler(os.Stdout, opts)

	return slog.New(handler).With(
		slog.String("service", serviceName),
		slog.String("env", appEnv),
	)
}

// FromCtx returns the logger stored in ctx, or the provided fallback if none is set.
func FromCtx(ctx context.Context, fallback *slog.Logger) *slog.Logger {
	if l, ok := ctx.Value(contextKey{}).(*slog.Logger); ok && l != nil {
		return l
	}
	return fallback
}

// WithCtx stores logger in ctx and returns the new context.
func WithCtx(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, contextKey{}, logger)
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
