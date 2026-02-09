package domain

import (
	"context"
)

type SupplierRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetSupplierList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int) ([]Supplier, *Error)
	GetSupplierListTotal(ctx context.Context, query string) (int64, *Error)
	GetSupplierById(ctx context.Context, id int64) (Supplier, *Error)
	CreateSupplier(ctx context.Context, material *Supplier) *Error
	UpdateSupplierById(ctx context.Context, material *Supplier, id int64) *Error
	DeleteSupplierById(ctx context.Context, id int64) *Error
}
