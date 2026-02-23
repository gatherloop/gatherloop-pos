package domain

import (
	"context"
)

type ProductUsecase struct {
	repository ProductRepository
}

func NewProductUsecase(repository ProductRepository) ProductUsecase {
	return ProductUsecase{repository: repository}
}

func (usecase ProductUsecase) GetProductList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, saleType *SaleType) ([]Product, int64, *Error) {
	products, err := usecase.repository.GetProductList(ctx, query, sortBy, order, skip, limit, saleType)
	if err != nil {
		return []Product{}, 0, err
	}

	total, err := usecase.repository.GetProductListTotal(ctx, query, saleType)
	if err != nil {
		return []Product{}, 0, err
	}

	return products, total, nil
}

func (usecase ProductUsecase) GetProductById(ctx context.Context, id int64) (Product, *Error) {
	return usecase.repository.GetProductById(ctx, id)
}

func (usecase ProductUsecase) CreateProduct(ctx context.Context, product Product) (Product, *Error) {
	return usecase.repository.CreateProduct(ctx, product)
}

func (usecase ProductUsecase) UpdateProductById(ctx context.Context, product Product, id int64) (Product, *Error) {
	var updateResult Product
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		updated, err := usecase.repository.UpdateProductById(ctxWithTx, product, id)
		if err != nil {
			return err
		}
		updateResult = updated
		return nil
	})

	if err != nil {
		return Product{}, err
	}

	return updateResult, nil
}

func (usecase ProductUsecase) DeleteProductById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
