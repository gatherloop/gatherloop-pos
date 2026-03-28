package mysql

import (
	"apps/api/domain"
	"apps/api/pkg/logger"
	"context"
	"errors"
	"log/slog"

	"gorm.io/gorm"
)

func ToSortByColumn(sortBy domain.SortBy) string {
	switch sortBy {
	case domain.CreatedAt:
		return "created_at"
	default:
		return "created_at"
	}
}

func ToOrderColumn(order domain.Order) string {
	switch order {
	case domain.Ascending:
		return "asc"
	case domain.Descending:
		return "desc"
	default:
		return "asc"
	}
}

// ToErrorCtx converts a GORM error to a domain.Error. When the error represents
// an unexpected DB failure (i.e. not ErrRecordNotFound), it logs the raw error
// at ERROR level so the details are captured before the opaque domain error is
// returned up the stack.
func ToErrorCtx(ctx context.Context, err error, operation string) *domain.Error {
	if err == nil {
		return nil
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &domain.Error{Type: domain.NotFound, Message: err.Error()}
	}

	logger.FromCtx(ctx, slog.Default()).ErrorContext(ctx, "database error",
		slog.String("operation", operation),
		slog.String("raw_error", err.Error()),
	)
	return &domain.Error{Type: domain.InternalServerError, Message: err.Error()}
}

// ToError is kept for callers that do not yet have a context available.
// Prefer ToErrorCtx when ctx is available.
func ToError(err error) *domain.Error {
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &domain.Error{
				Type:    domain.NotFound,
				Message: err.Error(),
			}
		} else {
			return &domain.Error{Type: domain.InternalServerError, Message: err.Error()}
		}
	}

	return nil
}
