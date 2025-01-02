package expense

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetExpenseList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Expense, error)
	GetExpenseById(ctx context.Context, id int64) (Expense, error)
	CreateExpense(ctx context.Context, expense *Expense) error
	UpdateExpenseById(ctx context.Context, expense *Expense, id int64) error
	DeleteExpenseById(ctx context.Context, id int64) error
	DeleteExpenseItems(ctx context.Context, expenseId int64) error
	CreateExpenseItems(ctx context.Context, expenseItems []ExpenseItem) error
}
