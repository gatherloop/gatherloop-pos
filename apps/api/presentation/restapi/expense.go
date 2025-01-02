package restapi

import (
	"apps/api/domain/expense"
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

	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	expenses, err := handler.usecase.GetExpenseList(ctx, sortBy, order, skip, limit)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiExpenses := []apiContract.Expense{}
	for _, expense := range expenses {
		apiExpenses = append(apiExpenses, ToApiExpense(expense))
	}

	json.NewEncoder(w).Encode(apiContract.ExpenseList200Response{Data: apiExpenses})
}

func (handler ExpenseHandler) GetExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	expense, err := handler.usecase.GetExpenseById(ctx, id)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.ExpenseFindById200Response{Data: ToApiExpense(expense)})
}

func (handler ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	expenseRequest, err := GetExpenseRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateExpense(ctx, ToExpenseRequest(expenseRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ExpenseHandler) UpdateExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	expenseRequest, err := GetExpenseRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateExpenseById(ctx, ToExpenseRequest(expenseRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ExpenseHandler) DeleteExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteExpenseById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
