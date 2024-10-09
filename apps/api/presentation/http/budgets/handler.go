package budgets_http

import (
	"apps/api/domain/budgets"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase budgets.Usecase
}

func NewHandler(usecase budgets.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetBudgetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	budgets, err := handler.usecase.GetBudgetList(ctx)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	var apiBudgets []apiContract.Budget

	for _, budget := range budgets {
		apiBudgets = append(apiBudgets, ToApiBudget(budget))
	}

	json.NewEncoder(w).Encode(apiContract.BudgetList200Response{Data: apiBudgets})
}

func (handler Handler) GetBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetBudgetId(r)

	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	budget, err := handler.usecase.GetBudgetById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	apiBudget := ToApiBudget(budget)

	json.NewEncoder(w).Encode(apiContract.BudgetFindById200Response{Data: apiBudget})
}

func (handler Handler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	budgetRequest, err := GetBudgetRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateBudget(ctx, ToBudgetRequest(budgetRequest)); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetBudgetId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	budgetRequest, err := GetBudgetRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateBudgetById(ctx, ToBudgetRequest(budgetRequest), id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetBudgetId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteBudgetById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
