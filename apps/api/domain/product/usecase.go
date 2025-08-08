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

func (usecase Usecase) DeleteProductById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteProductById(ctx, id)
}
