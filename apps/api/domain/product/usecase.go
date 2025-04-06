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

		var productMaterials []ProductMaterial
		for _, productMaterialRequest := range product.Materials {

			productMaterial := ProductMaterial{
				ProductId:  product.Id,
				MaterialId: productMaterialRequest.MaterialId,
				Amount:     productMaterialRequest.Amount,
			}

			productMaterials = append(productMaterials, productMaterial)
		}

		return usecase.repository.CreateProductMaterials(ctxWithTx, productMaterials)
	})
}

func (usecase Usecase) UpdateProductById(ctx context.Context, product Product, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingProduct, err := usecase.repository.GetProductById(ctxWithTx, id)
		if err != nil {
			return err
		}

		var productMaterials []ProductMaterial
		for _, productMaterial := range product.Materials {
			productMaterial := ProductMaterial{
				Id:         productMaterial.Id,
				ProductId:  id,
				MaterialId: productMaterial.MaterialId,
				Amount:     productMaterial.Amount,
			}

			productMaterials = append(productMaterials, productMaterial)
		}

		if err := usecase.repository.CreateProductMaterials(ctxWithTx, productMaterials); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, productRequestMaterial := range productMaterials {
			newIds[productRequestMaterial.Id] = true
		}

		for _, existingProductMaterial := range existingProduct.Materials {
			if !newIds[existingProductMaterial.Id] {
				if err := usecase.repository.DeleteProductMaterialById(ctxWithTx, existingProductMaterial.Id); err != nil {
					return err
				}
			}
		}

		product := Product{
			Name:        product.Name,
			CategoryId:  product.CategoryId,
			Price:       product.Price,
			Description: product.Description,
		}

		return usecase.repository.UpdateProductById(ctxWithTx, &product, id)
	})
}

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
