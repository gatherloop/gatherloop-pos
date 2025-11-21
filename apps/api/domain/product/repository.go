package product

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetProductList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, saleTypeQuery SaleTypeQuery) ([]Product, *base.Error)
	GetProductListTotal(ctx context.Context, query string, saleTypeQuery SaleTypeQuery) (int64, *base.Error)
	GetProductById(ctx context.Context, id int64) (Product, *base.Error)
	CreateProduct(ctx context.Context, variant *Product) *base.Error
	UpdateProductById(ctx context.Context, variant *Product, id int64) *base.Error
	DeleteProductById(ctx context.Context, id int64) *base.Error
	DeleteUnusedOptions(ctx context.Context, productId int64, idsToKeep []int64) *base.Error
	DeleteUnusedOptionValues(ctx context.Context, optionId int64, idsToKeep []int64) *base.Error
}
