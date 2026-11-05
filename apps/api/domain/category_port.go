//go:generate mockgen -source=category_port.go -destination=../data/mock/category_port.go -package=mock

package domain

import (
	"context"
)

type CategoryRepoPort interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetCategoryList(ctx context.Context) ([]Category, *Error)
	GetCategoryById(ctx context.Context, id int64) (Category, *Error)
	CreateCategory(ctx context.Context, category Category) (Category, *Error)
	UpdateCategoryById(ctx context.Context, category Category, id int64) (Category, *Error)
	DeleteCategoryById(ctx context.Context, id int64) *Error
}
