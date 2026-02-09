package domain

import (
	"context"
)

type ExpenseRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetExpenseList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, walletId *int, budgetId *int) ([]Expense, *Error)
	GetExpenseListTotal(ctx context.Context, query string, walletId *int, budgetId *int) (int64, *Error)
	GetExpenseById(ctx context.Context, id int64) (Expense, *Error)
	CreateExpense(ctx context.Context, expense *Expense) *Error
	UpdateExpenseById(ctx context.Context, expense *Expense, id int64) *Error
	DeleteExpenseById(ctx context.Context, id int64) *Error
	DeleteExpenseItemById(ctx context.Context, id int64) *Error
}
