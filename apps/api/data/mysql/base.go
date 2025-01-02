package mysql

import (
	"apps/api/domain/base"
	"apps/api/utils"
	"context"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func ToSortByColumn(sortBy base.SortBy) string {
	switch sortBy {
	case base.CreatedAt:
		return "created_at"
	default:
		return "created_at"
	}
}

func ToOrderColumn(order base.Order) string {
	switch order {
	case base.Ascending:
		return "asc"
	case base.Descending:
		return "desc"
	default:
		return "asc"
	}
}
