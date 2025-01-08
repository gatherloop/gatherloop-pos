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
			Price:       productRequest.Price,
			Description: productRequest.Description,
		}

		if err := usecase.repository.CreateProduct(ctxWithTx, &product); err != nil {
			return err
		}

		for _, productMaterialRequest := range productRequest.Materials {
			if err := usecase.repository.CreateProductMaterial(ctxWithTx, productMaterialRequest, product.Id); err != nil {
				return err
			}
		}

		return nil
	})
}

func (usecase Usecase) UpdateProductById(ctx context.Context, productRequest ProductRequest, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		product := Product{
			Name:        productRequest.Name,
			CategoryId:  productRequest.CategoryId,
			Price:       productRequest.Price,
			Description: productRequest.Description,
		}

		if err := usecase.repository.UpdateProductById(ctxWithTx, &product, id); err != nil {
			return err
		}

		if err := usecase.repository.DeleteProductMaterials(ctxWithTx, id); err != nil {
			return err
		}

		for _, productMaterialRequest := range productRequest.Materials {
			if err := usecase.repository.CreateProductMaterial(ctxWithTx, productMaterialRequest, id); err != nil {
				return err
			}
		}

		return nil
	})
}

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
