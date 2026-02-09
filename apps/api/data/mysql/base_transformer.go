package mysql

import (
	"apps/api/domain"
	"errors"

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
