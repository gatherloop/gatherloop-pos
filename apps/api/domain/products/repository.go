package products

import (
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetProductList(ctx context.Context, query string, sortBy string, order string, skip int, limit int) ([]Product, error)
	GetProductListTotal(ctx context.Context, query string) (int64, error)
	GetProductById(ctx context.Context, id int64) (Product, error)
	CreateProduct(ctx context.Context, product *Product) error
	UpdateProductById(ctx context.Context, product *Product, id int64) error
	DeleteProductById(ctx context.Context, id int64) error
	CreateProductMaterial(ctx context.Context, productMaterialRequest ProductMaterialRequest, productId int64) error
	DeleteProductMaterials(ctx context.Context, productId int64) error
}
