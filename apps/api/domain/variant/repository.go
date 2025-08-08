package variant

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetVariantList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, productId *int, optionValues []int) ([]Variant, *base.Error)
	GetVariantListTotal(ctx context.Context, query string) (int64, *base.Error)
	GetVariantById(ctx context.Context, id int64) (Variant, *base.Error)
	CreateVariant(ctx context.Context, variant *Variant) *base.Error
	UpdateVariantById(ctx context.Context, variant *Variant, id int64) *base.Error
	DeleteVariantById(ctx context.Context, id int64) *base.Error
	CreateVariantMaterials(ctx context.Context, variantMaterial []VariantMaterial) *base.Error
	DeleteVariantMaterialById(ctx context.Context, id int64) *base.Error
	DeleteUnusedValues(ctx context.Context, variantId int64, idsToKeep []int64) *base.Error
}
