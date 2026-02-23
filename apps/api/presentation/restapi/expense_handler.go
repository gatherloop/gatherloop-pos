package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type ExpenseHandler struct {
	usecase domain.ExpenseUsecase
}

func NewExpenseHandler(usecase domain.ExpenseUsecase) ExpenseHandler {
	return ExpenseHandler{usecase: usecase}
}

func (handler ExpenseHandler) GetExpenseList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	walletId := GetWalletIdQuery(r)
	budgetId := GetBudgetIdQuery(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	expenses, total, usecaseErr := handler.usecase.GetExpenseList(ctx, query, sortBy, order, skip, limit, walletId, budgetId)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiExpenses := []apiContract.Expense{}
	for _, expense := range expenses {
		apiExpenses = append(apiExpenses, ToApiExpense(expense))
	}

	WriteResponse(w, apiContract.ExpenseListResponse{Data: apiExpenses, Meta: apiContract.MetaPage{Total: total}})
}

func (handler ExpenseHandler) GetExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	expense, usecaseErr := handler.usecase.GetExpenseById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ExpenseFindByIdResponse{Data: ToApiExpense(expense)})
}

func (handler ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	expenseRequest, err := GetExpenseRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	createdExpense, usecaseErr := handler.usecase.CreateExpense(ctx, ToExpense(expenseRequest))
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ExpenseCreateResponse{Data: ToApiExpense(createdExpense)})
}

func (handler ExpenseHandler) UpdateExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	expenseRequest, err := GetExpenseRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	updatedExpense, usecaseErr := handler.usecase.UpdateExpenseById(ctx, ToExpense(expenseRequest), id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ExpenseUpdateByIdResponse{Data: ToApiExpense(updatedExpense)})
}

func (handler ExpenseHandler) DeleteExpenseById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetExpenseId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteExpenseById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
