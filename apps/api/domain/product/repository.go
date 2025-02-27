package product

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetProductList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Product, *base.Error)
	GetProductListTotal(ctx context.Context, query string) (int64, *base.Error)
	GetProductById(ctx context.Context, id int64) (Product, *base.Error)
	CreateProduct(ctx context.Context, product *Product) *base.Error
	UpdateProductById(ctx context.Context, product *Product, id int64) *base.Error
	DeleteProductById(ctx context.Context, id int64) *base.Error
	CreateProductMaterials(ctx context.Context, productMaterial []ProductMaterial) *base.Error
	DeleteProductMaterialById(ctx context.Context, id int64) *base.Error
}
