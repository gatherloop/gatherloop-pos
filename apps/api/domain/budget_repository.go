package domain

import (
	"context"
)

type BudgetRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetBudgetList(ctx context.Context) ([]Budget, *Error)
	GetBudgetById(ctx context.Context, id int64) (Budget, *Error)
	CreateBudget(ctx context.Context, budget Budget) (Budget, *Error)
	UpdateBudgetById(ctx context.Context, budget Budget, id int64) (Budget, *Error)
	DeleteBudgetById(ctx context.Context, id int64) *Error
}
