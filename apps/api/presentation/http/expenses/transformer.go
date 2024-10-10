package expenses_http

import (
	"apps/api/domain/expenses"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetExpenseId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["expenseId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetExpenseRequest(r *http.Request) (apiContract.ExpenseRequest, error) {
	var expenseRequest apiContract.ExpenseRequest
	err := json.NewDecoder(r.Body).Decode(&expenseRequest)
	return expenseRequest, err
}

func ToApiExpense(expense expenses.Expense) apiContract.Expense {
	apiExpenseItems := []apiContract.ExpenseItem{}
	for _, expenseItem := range expense.ExpenseItems {
		apiExpenseItems = append(apiExpenseItems, apiContract.ExpenseItem{
			Id:        expenseItem.Id,
			Name:      expenseItem.Name,
			Unit:      expenseItem.Unit,
			Price:     expenseItem.Price,
			Amount:    expenseItem.Amount,
			Subtotal:  expenseItem.Subtotal,
			ExpenseId: expenseItem.ExpenseId,
		})
	}

	return apiContract.Expense{
		Id:           expense.Id,
		DeletedAt:    expense.DeletedAt,
		CreatedAt:    expense.CreatedAt,
		WalletId:     expense.WalletId,
		Wallet:       apiContract.Wallet(expense.Wallet),
		BudgetId:     expense.BudgetId,
		Budget:       apiContract.Budget(expense.Budget),
		Total:        expense.Total,
		ExpenseItems: apiExpenseItems,
	}
}

func ToExpenseRequest(expenseRequest apiContract.ExpenseRequest) expenses.ExpenseRequest {
	expenseItemRequests := []expenses.ExpenseItemRequest{}
	for _, expenseItem := range expenseRequest.ExpenseItems {
		expenseItemRequests = append(expenseItemRequests, expenses.ExpenseItemRequest{
			Name:   expenseItem.Name,
			Unit:   expenseItem.Unit,
			Price:  expenseItem.Price,
			Amount: expenseItem.Amount,
		})
	}

	return expenses.ExpenseRequest{
		WalletId:     expenseRequest.WalletId,
		BudgetId:     expenseRequest.BudgetId,
		ExpenseItems: expenseItemRequests,
	}
}
