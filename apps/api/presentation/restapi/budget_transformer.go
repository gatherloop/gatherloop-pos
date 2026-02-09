package restapi

import (
	"apps/api/domain/budget"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetBudgetIdQuery(r *http.Request) *int {
	budgetId := r.URL.Query().Get("budgetId")

	id, err := strconv.Atoi(budgetId)
	if err != nil {
		return nil
	}

	return &id
}

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

func ToApiBudget(budget budget.Budget) apiContract.Budget {
	return apiContract.Budget{
		Id:         budget.Id,
		Name:       budget.Name,
		Percentage: budget.Percentage,
		Balance:    budget.Balance,
		DeletedAt:  budget.DeletedAt,
		CreatedAt:  budget.CreatedAt,
	}
}

func ToBudget(budgetRequest apiContract.BudgetRequest) budget.Budget {
	return budget.Budget{
		Name:       budgetRequest.Name,
		Percentage: budgetRequest.Percentage,
		Balance:    budgetRequest.Balance,
	}
}
