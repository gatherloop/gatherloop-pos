package domain

import (
	"context"
)

type MaterialRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetMaterialList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int) ([]Material, *Error)
	GetMaterialListTotal(ctx context.Context, query string) (int64, *Error)
	GetMaterialsWeeklyUsage(ctx context.Context, ids []int64) (map[int64]float32, *Error)
	GetMaterialById(ctx context.Context, id int64) (Material, *Error)
	CreateMaterial(ctx context.Context, material Material) (Material, *Error)
	UpdateMaterialById(ctx context.Context, material Material, id int64) (Material, *Error)
	DeleteMaterialById(ctx context.Context, id int64) *Error
}
