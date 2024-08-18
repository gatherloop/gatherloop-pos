package products

import (
	"context"
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetProductList(ctx context.Context, query string, sortBy string, order string, skip int, limit int) ([]apiContract.Product, error) {
	return usecase.repository.GetProductList(ctx, query, sortBy, order, skip, limit)
}

func (usecase Usecase) GetProductById(ctx context.Context, id int64) (apiContract.Product, error) {
	return usecase.repository.GetProductById(ctx, id)
}

func (usecase Usecase) CreateProduct(ctx context.Context, productRequest apiContract.ProductRequest) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		product := apiContract.Product{
			Name:       productRequest.Name,
			CategoryId: productRequest.CategoryId,
			Price:      productRequest.Price,
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

func (usecase Usecase) UpdateProductById(ctx context.Context, productRequest apiContract.ProductRequest, id int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		product := apiContract.Product{
			Name:       productRequest.Name,
			CategoryId: productRequest.CategoryId,
			Price:      productRequest.Price,
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

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) error {
	return usecase.repository.DeleteProductById(ctx, id)
}
