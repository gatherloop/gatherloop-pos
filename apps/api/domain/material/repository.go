package material

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Material, *base.Error)
	GetMaterialListTotal(ctx context.Context, query string) (int64, *base.Error)
	GetMaterialById(ctx context.Context, id int64) (Material, *base.Error)
	CreateMaterial(ctx context.Context, material *Material) *base.Error
	UpdateMaterialById(ctx context.Context, material *Material, id int64) *base.Error
	DeleteMaterialById(ctx context.Context, id int64) *base.Error
}
