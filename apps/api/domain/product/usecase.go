package product

import (
	"apps/api/domain/base"
	"context"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetProductList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Product, int64, *base.Error) {
	products, err := usecase.repository.GetProductList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		return []Product{}, 0, err
	}

	total, err := usecase.repository.GetProductListTotal(ctx, query)
	if err != nil {
		return []Product{}, 0, err
	}

	return products, total, nil
}

func (usecase Usecase) GetProductById(ctx context.Context, id int64) (Product, *base.Error) {
	return usecase.repository.GetProductById(ctx, id)
}

func (usecase Usecase) CreateProduct(ctx context.Context, product Product) *base.Error {
	return usecase.repository.CreateProduct(ctx, &product)
}

func (usecase Usecase) UpdateProductById(ctx context.Context, product Product, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		product := Product{
			Name:        product.Name,
			CategoryId:  product.CategoryId,
			Description: product.Description,
		}

		return usecase.repository.UpdateProductById(ctxWithTx, &product, id)
	})
}

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
