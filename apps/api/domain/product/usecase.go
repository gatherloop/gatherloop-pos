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

func (usecase Usecase) CreateProduct(ctx context.Context, productRequest ProductRequest) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		product := Product{
			Name:        productRequest.Name,
			CategoryId:  productRequest.CategoryId,
			Description: productRequest.Description,
		}

		if err := usecase.repository.CreateProduct(ctxWithTx, &product); err != nil {
			return err
		}

		var productMaterials []ProductMaterial
		for _, productMaterialRequest := range productRequest.Materials {

			productMaterial := ProductMaterial{
				ProductId:  product.Id,
				MaterialId: productMaterialRequest.MaterialId,
				Amount:     productMaterialRequest.Amount,
			}

			productMaterials = append(productMaterials, productMaterial)
		}
		if err := usecase.repository.CreateProductMaterials(ctxWithTx, productMaterials); err != nil {
			return err
		}

		var productVariants []ProductVariant
		for _, productVariantRequest := range productRequest.Variants {
			productVariants = append(productVariants, ProductVariant{
				ProductId: product.Id,
				Name:      productVariantRequest.Name,
			})
		}
		if err := usecase.repository.CreateProductVariants(ctxWithTx, productVariants); err != nil {
			return err
		}

		var productVariantOptions []ProductVariantOption
		for index, productVariant := range productVariants {
			for _, productVariantOption := range productRequest.Variants[index].Options {
				productVariantOptions = append(productVariantOptions, ProductVariantOption{
					ProductVariantId: productVariant.Id,
					Name:             productVariantOption.Name,
				})
			}
		}
		if err := usecase.repository.CreateProductVariantOptions(ctxWithTx, productVariantOptions); err != nil {
			return err
		}

		return nil
	})
}

func (usecase Usecase) UpdateProductById(ctx context.Context, productRequest ProductRequest, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingProduct, err := usecase.repository.GetProductById(ctxWithTx, id)
		if err != nil {
			return err
		}

		var productMaterials []ProductMaterial
		for _, productMaterialRequest := range productRequest.Materials {
			var productMaterialId int64
			if productMaterialRequest.Id != nil {
				productMaterialId = *productMaterialRequest.Id
			}
			productMaterial := ProductMaterial{
				Id:         productMaterialId,
				ProductId:  id,
				MaterialId: productMaterialRequest.MaterialId,
				Amount:     productMaterialRequest.Amount,
			}

			productMaterials = append(productMaterials, productMaterial)
		}

		if err := usecase.repository.CreateProductMaterials(ctxWithTx, productMaterials); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, productRequestMaterial := range productRequest.Materials {
			if productRequestMaterial.Id != nil {
				newIds[*productRequestMaterial.Id] = true
			}
		}

		for _, existingProductMaterial := range existingProduct.Materials {
			if !newIds[existingProductMaterial.Id] {
				if err := usecase.repository.DeleteProductMaterialById(ctxWithTx, existingProductMaterial.Id); err != nil {
					return err
				}
			}
		}

		product := Product{
			Name:        productRequest.Name,
			CategoryId:  productRequest.CategoryId,
			Description: productRequest.Description,
		}

		return usecase.repository.UpdateProductById(ctxWithTx, &product, id)
	})
}

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
