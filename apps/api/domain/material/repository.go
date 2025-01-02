package material

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Material, error)
	GetMaterialListTotal(ctx context.Context, query string) (int64, error)
	GetMaterialById(ctx context.Context, id int64) (Material, error)
	CreateMaterial(ctx context.Context, materialRequest MaterialRequest) error
	UpdateMaterialById(ctx context.Context, materialRequest MaterialRequest, id int64) error
	DeleteMaterialById(ctx context.Context, id int64) error
}
