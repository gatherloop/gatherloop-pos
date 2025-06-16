package category

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetCategoryList(ctx context.Context) ([]Category, *base.Error)
	GetCategoryById(ctx context.Context, id int64) (Category, *base.Error)
	CreateCategory(ctx context.Context, category *Category) *base.Error
	UpdateCategoryById(ctx context.Context, category *Category, id int64) *base.Error
	DeleteCategoryById(ctx context.Context, id int64) *base.Error
}
