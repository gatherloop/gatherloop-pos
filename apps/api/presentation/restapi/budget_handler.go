package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type BudgetHandler struct {
	usecase domain.BudgetUsecase
}

func NewBudgetHandler(usecase domain.BudgetUsecase) BudgetHandler {
	return BudgetHandler{usecase: usecase}
}

func (handler BudgetHandler) GetBudgetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	budgets, err := handler.usecase.GetBudgetList(ctx)
	if err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiBudgets := []apiContract.Budget{}

	for _, budget := range budgets {
		apiBudgets = append(apiBudgets, ToApiBudget(budget))
	}

	WriteResponse(w, apiContract.BudgetList200Response{Data: apiBudgets})
}

func (handler BudgetHandler) GetBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetBudgetId(r)

	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	budget, usecaseErr := handler.usecase.GetBudgetById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiBudget := ToApiBudget(budget)

	WriteResponse(w, apiContract.BudgetFindById200Response{Data: apiBudget})
}

func (handler BudgetHandler) CreateBudget(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	budgetRequest, err := GetBudgetRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateBudget(ctx, ToBudget(budgetRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler BudgetHandler) UpdateBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetBudgetId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	budgetRequest, err := GetBudgetRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateBudgetById(ctx, ToBudget(budgetRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler BudgetHandler) DeleteBudgetById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetBudgetId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteBudgetById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
