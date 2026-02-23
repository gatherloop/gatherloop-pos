package domain

import (
	"context"
)

type ProductRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetProductList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, saleType *SaleType) ([]Product, *Error)
	GetProductListTotal(ctx context.Context, query string, saleType *SaleType) (int64, *Error)
	GetProductById(ctx context.Context, id int64) (Product, *Error)
	CreateProduct(ctx context.Context, product Product) (Product, *Error)
	UpdateProductById(ctx context.Context, product Product, id int64) (Product, *Error)
	DeleteProductById(ctx context.Context, id int64) *Error
}
