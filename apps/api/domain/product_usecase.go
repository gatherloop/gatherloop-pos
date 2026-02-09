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

func (usecase ProductUsecase) CreateProduct(ctx context.Context, product Product) *Error {
	return usecase.repository.CreateProduct(ctx, &product)
}

func (usecase ProductUsecase) UpdateProductById(ctx context.Context, product Product, id int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		options := []Option{}
		for _, option := range product.Options {
			values := []OptionValue{}

			for _, value := range option.Values {
				values = append(values, OptionValue{
					Id:       value.Id,
					Name:     value.Name,
					OptionId: option.Id,
				})
			}

			options = append(options, Option{
				Id:        option.Id,
				ProductId: id,
				Name:      option.Name,
				Values:    values,
			})
		}

		payload := Product{
			Id:          id,
			CategoryId:  product.CategoryId,
			Name:        product.Name,
			ImageUrl:    product.ImageUrl,
			Description: product.Description,
			DeletedAt:   product.DeletedAt,
			CreatedAt:   product.CreatedAt,
			Options:     options,
			SaleType:    product.SaleType,
		}

		if err := usecase.repository.UpdateProductById(ctxWithTx, &payload, id); err != nil {
			return err
		}

		newOptionIds := []int64{}
		for _, option := range payload.Options {
			newOptionIds = append(newOptionIds, option.Id)

			newOptionValueIds := []int64{}
			for _, value := range option.Values {
				newOptionValueIds = append(newOptionValueIds, value.Id)
			}

			usecase.repository.DeleteUnusedOptionValues(ctxWithTx, option.Id, newOptionValueIds)
		}

		return usecase.repository.DeleteUnusedOptions(ctxWithTx, id, newOptionIds)
	})
}

func (usecase ProductUsecase) DeleteProductById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
