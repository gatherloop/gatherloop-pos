package transactionCategory

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

func (usecase Usecase) GetTransactionCategoryList(ctx context.Context) ([]TransactionCategory, *base.Error) {
	return usecase.repository.GetTransactionCategoryList(ctx)
}

func (usecase Usecase) GetTransactionCategoryById(ctx context.Context, id int64) (TransactionCategory, *base.Error) {
	return usecase.repository.GetTransactionCategoryById(ctx, id)
}

func (usecase Usecase) CreateTransactionCategory(ctx context.Context, category TransactionCategory) *base.Error {
	return usecase.repository.CreateTransactionCategory(ctx, &category)
}

func (usecase Usecase) UpdateTransactionCategoryById(ctx context.Context, category TransactionCategory, id int64) *base.Error {
	return usecase.repository.UpdateTransactionCategoryById(ctx, &category, id)
}

func (usecase Usecase) DeleteTransactionCategoryById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteTransactionCategoryById(ctx, id)
}
