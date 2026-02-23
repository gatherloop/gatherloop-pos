package domain

import (
	"context"
)

type VariantUsecase struct {
	repository VariantRepository
}

func NewVariantUsecase(repository VariantRepository) VariantUsecase {
	return VariantUsecase{repository: repository}
}

func (usecase VariantUsecase) GetVariantList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, productId *int, optionValueIds []int) ([]Variant, int64, *Error) {
	variants, err := usecase.repository.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if err != nil {
		return []Variant{}, 0, err
	}

	total, err := usecase.repository.GetVariantListTotal(ctx, query)
	if err != nil {
		return []Variant{}, 0, err
	}

	return variants, total, nil
}

func (usecase VariantUsecase) GetVariantById(ctx context.Context, id int64) (Variant, *Error) {
	return usecase.repository.GetVariantById(ctx, id)
}

func (usecase VariantUsecase) CreateVariant(ctx context.Context, variant Variant) (Variant, *Error) {
	return usecase.repository.CreateVariant(ctx, variant)
}

func (usecase VariantUsecase) UpdateVariantById(ctx context.Context, variant Variant, id int64) (Variant, *Error) {
	var updateResult Variant
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		updated, err := usecase.repository.UpdateVariantById(ctxWithTx, variant, id)
		if err != nil {
			return err
		}
		updateResult = updated
		return nil
	})
	return updateResult, err
}

func (usecase VariantUsecase) DeleteVariantById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteVariantById(ctx, id)
}
