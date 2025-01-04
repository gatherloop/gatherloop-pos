package handlers

import (
	"apps/api/domain/budget"
	"apps/api/presentation/restapi"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type BudgetHandler struct {
	usecase budget.Usecase
}

func NewBudgetHandler(usecase budget.Usecase) BudgetHandler {
	return BudgetHandler{usecase: usecase}
}

func (handler BudgetHandler) GetBudgetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	budgets, err := handler.usecase.GetBudgetList(ctx)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiBudgets := []apiContract.Budget{}

	for _, budget := range budgets {
		apiBudgets = append(apiBudgets, restapi.ToApiBudget(budget))
	}

	json.NewEncoder(w).Encode(apiContract.BudgetList200Response{Data: apiBudgets})
}

func (handler BudgetHandler) GetBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetBudgetId(r)

	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	budget, err := handler.usecase.GetBudgetById(ctx, id)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	apiBudget := restapi.ToApiBudget(budget)

	json.NewEncoder(w).Encode(apiContract.BudgetFindById200Response{Data: apiBudget})
}

func (handler BudgetHandler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	budgetRequest, err := restapi.GetBudgetRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateBudget(ctx, restapi.ToBudgetRequest(budgetRequest)); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler BudgetHandler) UpdateBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetBudgetId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	budgetRequest, err := restapi.GetBudgetRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateBudgetById(ctx, restapi.ToBudgetRequest(budgetRequest), id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler BudgetHandler) DeleteBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetBudgetId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteBudgetById(ctx, id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
