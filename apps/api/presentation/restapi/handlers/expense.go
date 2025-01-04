package handlers

import (
	"apps/api/domain/expense"
	"apps/api/presentation/restapi"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type ExpenseHandler struct {
	usecase expense.Usecase
}

func NewExpenseHandler(usecase expense.Usecase) ExpenseHandler {
	return ExpenseHandler{usecase: usecase}
}

func (handler ExpenseHandler) GetExpenseList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	sortBy := restapi.GetSortBy(r)
	order := restapi.GetOrder(r)

	skip, err := restapi.GetSkip(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := restapi.GetLimit(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	expenses, err := handler.usecase.GetExpenseList(ctx, sortBy, order, skip, limit)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiExpenses := []apiContract.Expense{}
	for _, expense := range expenses {
		apiExpenses = append(apiExpenses, restapi.ToApiExpense(expense))
	}

	json.NewEncoder(w).Encode(apiContract.ExpenseList200Response{Data: apiExpenses})
}

func (handler ExpenseHandler) GetExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetExpenseId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	expense, err := handler.usecase.GetExpenseById(ctx, id)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.ExpenseFindById200Response{Data: restapi.ToApiExpense(expense)})
}

func (handler ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	expenseRequest, err := restapi.GetExpenseRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateExpense(ctx, restapi.ToExpenseRequest(expenseRequest)); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ExpenseHandler) UpdateExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetExpenseId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	expenseRequest, err := restapi.GetExpenseRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateExpenseById(ctx, restapi.ToExpenseRequest(expenseRequest), id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ExpenseHandler) DeleteExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetExpenseId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteExpenseById(ctx, id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
