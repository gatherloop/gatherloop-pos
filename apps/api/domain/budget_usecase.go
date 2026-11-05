package domain

import (
	"context"
)

type BudgetUsecase struct {
	budgetRepoPort BudgetRepoPort
}

func NewBudgetUsecase(budgetRepoPort BudgetRepoPort) BudgetUsecase {
	return BudgetUsecase{budgetRepoPort: budgetRepoPort}
}

func (usecase BudgetUsecase) GetBudgetList(ctx context.Context) ([]Budget, *Error) {
	return usecase.budgetRepoPort.GetBudgetList(ctx)
}

func (usecase BudgetUsecase) GetBudgetById(ctx context.Context, id int64) (Budget, *Error) {
	return usecase.budgetRepoPort.GetBudgetById(ctx, id)
}

func (usecase BudgetUsecase) CreateBudget(ctx context.Context, budget Budget) (Budget, *Error) {
	return usecase.budgetRepoPort.CreateBudget(ctx, budget)
}

func (usecase BudgetUsecase) UpdateBudgetById(ctx context.Context, budget Budget, id int64) (Budget, *Error) {
	return usecase.budgetRepoPort.UpdateBudgetById(ctx, budget, id)
}

func (usecase BudgetUsecase) DeleteBudgetById(ctx context.Context, id int64) *Error {
	return usecase.budgetRepoPort.DeleteBudgetById(ctx, id)
}
