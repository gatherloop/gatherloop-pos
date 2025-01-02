package budget

import (
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetBudgetList(ctx context.Context) ([]Budget, error)
	GetBudgetById(ctx context.Context, id int64) (Budget, error)
	CreateBudget(ctx context.Context, budgetRequest BudgetRequest) error
	UpdateBudgetById(ctx context.Context, budgetRequest BudgetRequest, id int64) error
	DeleteBudgetById(ctx context.Context, id int64) error
}
