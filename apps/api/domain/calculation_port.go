//go:generate mockgen -source=calculation_port.go -destination=../data/mock/calculation_port.go -package=mock

package domain

import (
	"context"
)

type CalculationRepoPort interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetCalculationList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]Calculation, *Error)
	GetCalculationById(ctx context.Context, id int64) (Calculation, *Error)
	CreateCalculation(ctx context.Context, calculation Calculation) (Calculation, *Error)
	UpdateCalculationById(ctx context.Context, calculation Calculation, id int64) (Calculation, *Error)
	DeleteCalculationById(ctx context.Context, id int64) *Error
	CompleteCalculationById(ctx context.Context, id int64) *Error
}
