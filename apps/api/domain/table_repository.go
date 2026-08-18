//go:generate mockgen -source=table_repository.go -destination=../data/mock/table_repository.go -package=mock

package domain

import (
	"context"
)

type TableRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetTableList(ctx context.Context) ([]Table, *Error)
	GetTableById(ctx context.Context, id int64) (Table, *Error)
	GetTableByCode(ctx context.Context, code string) (Table, *Error)
	GetTableByLabel(ctx context.Context, label string) (Table, *Error)
	CreateTable(ctx context.Context, table Table) (Table, *Error)
	UpdateTableById(ctx context.Context, table Table, id int64) (Table, *Error)
	DeleteTableById(ctx context.Context, id int64) *Error
}
