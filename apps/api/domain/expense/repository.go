package expense

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetExpenseList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, walletId *int, budgetId *int) ([]Expense, *base.Error)
	GetExpenseListTotal(ctx context.Context, query string, walletId *int, budgetId *int) (int64, *base.Error)
	GetExpenseById(ctx context.Context, id int64) (Expense, *base.Error)
	CreateExpense(ctx context.Context, expense *Expense) *base.Error
	UpdateExpenseById(ctx context.Context, expense *Expense, id int64) *base.Error
	DeleteExpenseById(ctx context.Context, id int64) *base.Error
	DeleteExpenseItemById(ctx context.Context, id int64) *base.Error
}
