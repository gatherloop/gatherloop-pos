package budgets_http

import (
	"apps/api/domain/budgets"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetBudgetId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["budgetId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetBudgetRequest(r *http.Request) (apiContract.BudgetRequest, error) {
	var budgetRequest apiContract.BudgetRequest
	err := json.NewDecoder(r.Body).Decode(&budgetRequest)
	return budgetRequest, err
}

func ToApiBudget(budget budgets.Budget) apiContract.Budget {
	return apiContract.Budget{
		Id:         budget.Id,
		Name:       budget.Name,
		Percentage: budget.Percentage,
		Balance:    budget.Balance,
		DeletedAt:  budget.DeletedAt,
		CreatedAt:  budget.CreatedAt,
	}
}

func ToBudgetRequest(budgetRequest apiContract.BudgetRequest) budgets.BudgetRequest {
	return budgets.BudgetRequest{
		Name:       budgetRequest.Name,
		Percentage: budgetRequest.Percentage,
		Balance:    budgetRequest.Balance,
	}
}
