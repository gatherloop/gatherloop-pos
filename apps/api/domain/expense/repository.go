package expense

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetExpenseList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Expense, *base.Error)
	GetExpenseById(ctx context.Context, id int64) (Expense, *base.Error)
	CreateExpense(ctx context.Context, expense *Expense) *base.Error
	UpdateExpenseById(ctx context.Context, expense *Expense, id int64) *base.Error
	DeleteExpenseById(ctx context.Context, id int64) *base.Error
	CreateExpenseItems(ctx context.Context, expenseItems []ExpenseItem) *base.Error
	DeleteExpenseItemById(ctx context.Context, id int64) *base.Error
}
