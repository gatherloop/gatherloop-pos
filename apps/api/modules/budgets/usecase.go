package budgets

import (
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetBudgetList() ([]apiContract.Budget, error) {
	return usecase.repository.GetBudgetList()
}

func (usecase Usecase) GetBudgetById(id int64) (apiContract.Budget, error) {
	return usecase.repository.GetBudgetById(id)
}

func (usecase Usecase) CreateBudget(budgetRequest apiContract.BudgetRequest) error {
	return usecase.repository.CreateBudget(budgetRequest)
}

func (usecase Usecase) UpdateBudgetById(budgetRequest apiContract.BudgetRequest, id int64) error {
	return usecase.repository.UpdateBudgetById(budgetRequest, id)
}

func (usecase Usecase) DeleteBudgetById(id int64) error {
	return usecase.repository.DeleteBudgetById(id)
}
