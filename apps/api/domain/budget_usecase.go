package domain

import (
	"context"
)

type BudgetUsecase struct {
	repository BudgetRepository
}

func NewBudgetUsecase(repository BudgetRepository) BudgetUsecase {
	return BudgetUsecase{repository: repository}
}

func (usecase BudgetUsecase) GetBudgetList(ctx context.Context) ([]Budget, *Error) {
	return usecase.repository.GetBudgetList(ctx)
}

func (usecase BudgetUsecase) GetBudgetById(ctx context.Context, id int64) (Budget, *Error) {
	return usecase.repository.GetBudgetById(ctx, id)
}

func (usecase BudgetUsecase) CreateBudget(ctx context.Context, budget Budget) *Error {
	return usecase.repository.CreateBudget(ctx, &budget)
}

func (usecase BudgetUsecase) UpdateBudgetById(ctx context.Context, budget Budget, id int64) *Error {
	return usecase.repository.UpdateBudgetById(ctx, &budget, id)
}

func (usecase BudgetUsecase) DeleteBudgetById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteBudgetById(ctx, id)
}
