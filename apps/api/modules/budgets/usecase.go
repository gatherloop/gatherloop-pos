package budgets

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

func (usecase Usecase) GetBudgetList(ctx context.Context) ([]apiContract.Budget, error) {
	return usecase.repository.GetBudgetList(ctx)
}

func (usecase Usecase) GetBudgetById(ctx context.Context, id int64) (apiContract.Budget, error) {
	return usecase.repository.GetBudgetById(ctx, id)
}

func (usecase Usecase) CreateBudget(ctx context.Context, budgetRequest apiContract.BudgetRequest) error {
	return usecase.repository.CreateBudget(ctx, budgetRequest)
}

func (usecase Usecase) UpdateBudgetById(ctx context.Context, budgetRequest apiContract.BudgetRequest, id int64) error {
	return usecase.repository.UpdateBudgetById(ctx, budgetRequest, id)
}

func (usecase Usecase) DeleteBudgetById(ctx context.Context, id int64) error {
	return usecase.repository.DeleteBudgetById(ctx, id)
}
