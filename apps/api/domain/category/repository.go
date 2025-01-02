package category

import (
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetCategoryList(ctx context.Context) ([]Category, error)
	GetCategoryById(ctx context.Context, id int64) (Category, error)
	CreateCategory(ctx context.Context, categoryRequest CategoryRequest) error
	UpdateCategoryById(ctx context.Context, categoryRequest CategoryRequest, id int64) error
	DeleteCategoryById(ctx context.Context, id int64) error
}
