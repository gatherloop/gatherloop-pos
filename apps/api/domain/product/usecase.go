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
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		if err := usecase.repository.CreateProduct(ctxWithTx, &product); err != nil {
			return err
		}

		for i := 1; i < len(product.Materials); i++ {
			product.Materials[i].ProductId = product.Id

			if err := usecase.repository.CreateProductMaterial(ctxWithTx, &product.Materials[i]); err != nil {
				return err
			}
		}

		for i := 1; i < len(product.Variants); i++ {
			productVariant := product.Variants[i]
			productVariant.ProductId = product.Id

			if err := usecase.repository.CreateProductVariant(ctxWithTx, &productVariant); err != nil {
				return err
			}

			for j := 1; j < len(productVariant.Options); j++ {
				productVariantOption := productVariant.Options[j]
				productVariantOption.ProductVariantId = productVariant.Id

				if err := usecase.repository.CreateProductVariantOption(ctxWithTx, &productVariantOption); err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (usecase Usecase) UpdateProductById(ctx context.Context, product Product, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingProduct, err := usecase.repository.GetProductById(ctxWithTx, id)
		if err != nil {
			return err
		}

		existingProductVariantOptions, err := usecase.repository.GetProductVariantOptionListByProductId(ctxWithTx, id)
		if err != nil {
			return err
		}

		for i := 1; i < len(product.Materials); i++ {
			product.Materials[i].ProductId = product.Id
			if err := usecase.repository.CreateProductMaterial(ctxWithTx, &product.Materials[i]); err != nil {
				return err
			}
		}

		for _, existingProductMaterial := range existingProduct.Materials {
			found := false

			for _, productMaterial := range product.Materials {
				found = productMaterial.Id == existingProductMaterial.Id
			}

			if !found {
				if err := usecase.repository.DeleteProductMaterialById(ctxWithTx, existingProductMaterial.Id); err != nil {
					return err
				}
			}
		}

		for i := 1; i < len(product.Variants); i++ {
			productVariant := product.Variants[i]
			productVariant.ProductId = product.Id

			if err := usecase.repository.CreateProductVariant(ctxWithTx, &productVariant); err != nil {
				return err
			}

			for j := 1; j < len(productVariant.Options); j++ {
				productVariantOption := productVariant.Options[j]
				productVariantOption.ProductVariantId = productVariant.Id

				if err := usecase.repository.CreateProductVariantOption(ctxWithTx, &productVariantOption); err != nil {
					return err
				}
			}
		}

		for _, existingProductVariant := range existingProduct.Variants {
			found := false
			for _, productVariant := range product.Variants {
				found = productVariant.Id == existingProductVariant.Id
			}

			if !found {
				if err := usecase.repository.DeleteProductVariantById(ctxWithTx, existingProductVariant.Id); err != nil {
					return err
				}
			}
		}

		for _, existingProductVariantOption := range existingProductVariantOptions {
			found := false
			for _, productVariant := range product.Variants {
				for _, productVariantOption := range productVariant.Options {
					found = productVariantOption.Id == existingProductVariantOption.Id
				}
			}
			if !found {
				if err := usecase.repository.DeleteProductVariantOptionById(ctxWithTx, existingProductVariantOption.Id); err != nil {
					return err
				}
			}
		}

		return usecase.repository.UpdateProductById(ctxWithTx, &product, id)
	})
}

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
