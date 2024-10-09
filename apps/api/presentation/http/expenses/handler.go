package expenses_http

import (
	"apps/api/domain/expenses"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase expenses.Usecase
}

func NewHandler(usecase expenses.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetExpenseList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	sortBy := base.GetSortBy(r)
	order := base.GetOrder(r)

	skip, err := base.GetSkip(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := base.GetLimit(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	expenses, err := handler.usecase.GetExpenseList(ctx, sortBy, order, skip, limit)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	var apiExpenses []apiContract.Expense
	for _, expense := range expenses {
		apiExpenses = append(apiExpenses, ToApiExpense(expense))
	}

	json.NewEncoder(w).Encode(apiContract.ExpenseList200Response{Data: apiExpenses})
}

func (handler Handler) GetExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	expense, err := handler.usecase.GetExpenseById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.ExpenseFindById200Response{Data: ToApiExpense(expense)})
}

func (handler Handler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	expenseRequest, err := GetExpenseRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateExpense(ctx, ToExpenseRequest(expenseRequest)); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	expenseRequest, err := GetExpenseRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateExpenseById(ctx, ToExpenseRequest(expenseRequest), id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteExpenseById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
