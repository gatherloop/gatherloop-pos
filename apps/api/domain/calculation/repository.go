package calculation

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetCalculationList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Calculation, *base.Error)
	GetCalculationById(ctx context.Context, id int64) (Calculation, *base.Error)
	CreateCalculation(ctx context.Context, calculation *Calculation) *base.Error
	UpdateCalculationById(ctx context.Context, calculation *Calculation, id int64) *base.Error
	DeleteCalculationById(ctx context.Context, id int64) *base.Error
	CreateCalculationItems(ctx context.Context, calculationItems []CalculationItem) *base.Error
	DeleteCalculationItemById(ctx context.Context, id int64) *base.Error
}
