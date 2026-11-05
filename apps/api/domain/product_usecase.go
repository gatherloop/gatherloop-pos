package domain

import (
	"context"
)

type ProductUsecase struct {
	productRepoPort ProductRepoPort
	variantRepoPort VariantRepoPort
}

func NewProductUsecase(
	productRepoPort ProductRepoPort,
	variantRepoPort VariantRepoPort,
) ProductUsecase {
	return ProductUsecase{
		productRepoPort: productRepoPort,
		variantRepoPort: variantRepoPort,
	}
}

func (usecase ProductUsecase) GetProductList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, saleType *SaleType, status *ProductStatus) ([]Product, int64, *Error) {
	products, err := usecase.productRepoPort.GetProductList(ctx, query, sortBy, order, skip, limit, saleType, status)
	if err != nil {
		return []Product{}, 0, err
	}

	total, err := usecase.productRepoPort.GetProductListTotal(ctx, query, saleType, status)
	if err != nil {
		return []Product{}, 0, err
	}

	return products, total, nil
}

func (usecase ProductUsecase) GetProductById(ctx context.Context, id int64) (Product, *Error) {
	return usecase.productRepoPort.GetProductById(ctx, id)
}

func (usecase ProductUsecase) CreateProduct(ctx context.Context, product Product) (Product, *Error) {
	return usecase.productRepoPort.CreateProduct(ctx, product)
}

func (usecase ProductUsecase) UpdateProductById(ctx context.Context, product Product, id int64) (Product, *Error) {
	var updateResult Product
	err := usecase.productRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, err := usecase.productRepoPort.GetProductById(ctxWithTx, id)
		if err != nil {
			return err
		}

		updated, err := usecase.productRepoPort.UpdateProductById(ctxWithTx, product, id)
		if err != nil {
			return err
		}
		updateResult = updated

		if product.AvailabilityTracking != "" && product.AvailabilityTracking != existing.AvailabilityTracking {
			if err := usecase.productRepoPort.ClearAvailableQuantity(ctxWithTx, id); err != nil {
				return err
			}
			if err := usecase.variantRepoPort.ClearAvailableQuantityByProductId(ctxWithTx, id); err != nil {
				return err
			}
			updateResult.AvailableQuantity = nil
		}

		return nil
	})

	if err != nil {
		return Product{}, err
	}

	return updateResult, nil
}

func (usecase ProductUsecase) DeleteProductById(ctx context.Context, id int64) *Error {
	return usecase.productRepoPort.DeleteProductById(ctx, id)
}
