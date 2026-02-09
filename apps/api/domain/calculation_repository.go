package domain

import (
	"context"
)

type CalculationRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetCalculationList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]Calculation, *Error)
	GetCalculationById(ctx context.Context, id int64) (Calculation, *Error)
	CreateCalculation(ctx context.Context, calculation *Calculation) *Error
	UpdateCalculationById(ctx context.Context, calculation *Calculation, id int64) *Error
	DeleteCalculationById(ctx context.Context, id int64) *Error
	CreateCalculationItems(ctx context.Context, calculationItems []CalculationItem) *Error
	DeleteCalculationItemById(ctx context.Context, id int64) *Error
	CompleteCalculationById(ctx context.Context, id int64) *Error
}
