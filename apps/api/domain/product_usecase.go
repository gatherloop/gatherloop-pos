package domain

import (
	"context"
)

type ProductUsecase struct {
	repository        ProductRepository
	variantRepository VariantRepository
}

func NewProductUsecase(repository ProductRepository, variantRepository VariantRepository) ProductUsecase {
	return ProductUsecase{repository: repository, variantRepository: variantRepository}
}

func (usecase ProductUsecase) resolveAvailability(ctx context.Context, product Product) (Product, *Error) {
	productId := int(product.Id)
	variants, err := usecase.variantRepository.GetVariantList(ctx, "", CreatedAt, Ascending, 0, 0, &productId, []int{})
	if err != nil {
		return Product{}, err
	}

	isSellable, sellableQuantity := ResolveProductAvailability(product, variants)
	product.IsSellable = isSellable
	product.SellableQuantity = sellableQuantity
	return product, nil
}

func (usecase ProductUsecase) GetProductList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, saleType *SaleType, status *ProductStatus) ([]Product, int64, *Error) {
	products, err := usecase.repository.GetProductList(ctx, query, sortBy, order, skip, limit, saleType, status)
	if err != nil {
		return []Product{}, 0, err
	}

	for i, product := range products {
		resolved, err := usecase.resolveAvailability(ctx, product)
		if err != nil {
			return []Product{}, 0, err
		}
		products[i] = resolved
	}

	total, err := usecase.repository.GetProductListTotal(ctx, query, saleType, status)
	if err != nil {
		return []Product{}, 0, err
	}

	return products, total, nil
}

func (usecase ProductUsecase) GetProductById(ctx context.Context, id int64) (Product, *Error) {
	product, err := usecase.repository.GetProductById(ctx, id)
	if err != nil {
		return Product{}, err
	}

	return usecase.resolveAvailability(ctx, product)
}

func (usecase ProductUsecase) CreateProduct(ctx context.Context, product Product) (Product, *Error) {
	created, err := usecase.repository.CreateProduct(ctx, product)
	if err != nil {
		return Product{}, err
	}

	return usecase.resolveAvailability(ctx, created)
}

func (usecase ProductUsecase) UpdateProductById(ctx context.Context, product Product, id int64) (Product, *Error) {
	var updateResult Product
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, err := usecase.repository.GetProductById(ctxWithTx, id)
		if err != nil {
			return err
		}

		updated, err := usecase.repository.UpdateProductById(ctxWithTx, product, id)
		if err != nil {
			return err
		}
		updateResult = updated

		// D2 (docs/prd-product-availability.md): a quantity entered against the old
		// tracking level means nothing against the new one, so it is cleared rather
		// than silently reinterpreted. The availability switches are left alone.
		if product.AvailabilityTracking != "" && product.AvailabilityTracking != existing.AvailabilityTracking {
			if err := usecase.repository.ClearAvailableQuantity(ctxWithTx, id); err != nil {
				return err
			}
			if err := usecase.variantRepository.ClearAvailableQuantityByProductId(ctxWithTx, id); err != nil {
				return err
			}
			updateResult.AvailableQuantity = nil
		}

		return nil
	})

	if err != nil {
		return Product{}, err
	}

	return usecase.resolveAvailability(ctx, updateResult)
}

func (usecase ProductUsecase) DeleteProductById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
