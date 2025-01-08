package budget

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

func (usecase Usecase) GetBudgetList(ctx context.Context) ([]Budget, *base.Error) {
	return usecase.repository.GetBudgetList(ctx)
}

func (usecase Usecase) GetBudgetById(ctx context.Context, id int64) (Budget, *base.Error) {
	return usecase.repository.GetBudgetById(ctx, id)
}

func (usecase Usecase) CreateBudget(ctx context.Context, budgetRequest BudgetRequest) *base.Error {
	return usecase.repository.CreateBudget(ctx, budgetRequest)
}

func (usecase Usecase) UpdateBudgetById(ctx context.Context, budgetRequest BudgetRequest, id int64) *base.Error {
	return usecase.repository.UpdateBudgetById(ctx, budgetRequest, id)
}

func (usecase Usecase) DeleteBudgetById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteBudgetById(ctx, id)
}
