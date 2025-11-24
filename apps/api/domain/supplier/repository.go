package supplier

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetSupplierList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Supplier, *base.Error)
	GetSupplierListTotal(ctx context.Context, query string) (int64, *base.Error)
	GetSupplierById(ctx context.Context, id int64) (Supplier, *base.Error)
	CreateSupplier(ctx context.Context, material *Supplier) *base.Error
	UpdateSupplierById(ctx context.Context, material *Supplier, id int64) *base.Error
	DeleteSupplierById(ctx context.Context, id int64) *base.Error
}
