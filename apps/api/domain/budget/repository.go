package budget

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetBudgetList(ctx context.Context) ([]Budget, *base.Error)
	GetBudgetById(ctx context.Context, id int64) (Budget, *base.Error)
	CreateBudget(ctx context.Context, budget *Budget) *base.Error
	UpdateBudgetById(ctx context.Context, budget *Budget, id int64) *base.Error
	DeleteBudgetById(ctx context.Context, id int64) *base.Error
}
