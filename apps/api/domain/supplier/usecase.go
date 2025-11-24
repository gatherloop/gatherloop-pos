package supplier

import (
	"apps/api/domain/base"
	"context"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetSupplierList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Supplier, int64, *base.Error) {
	suppliers, err := usecase.repository.GetSupplierList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		return []Supplier{}, 0, err
	}

	total, err := usecase.repository.GetSupplierListTotal(ctx, query)
	if err != nil {
		return []Supplier{}, 0, err
	}

	return suppliers, total, nil
}

func (usecase Usecase) GetSupplierById(ctx context.Context, id int64) (Supplier, *base.Error) {
	supplier, err := usecase.repository.GetSupplierById(ctx, id)
	if err != nil {
		return Supplier{}, err
	}

	return supplier, nil
}

func (usecase Usecase) CreateSupplier(ctx context.Context, supplier Supplier) *base.Error {
	return usecase.repository.CreateSupplier(ctx, &supplier)
}

func (usecase Usecase) UpdateSupplierById(ctx context.Context, supplier Supplier, id int64) *base.Error {
	return usecase.repository.UpdateSupplierById(ctx, &supplier, id)
}

func (usecase Usecase) DeleteSupplierById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteSupplierById(ctx, id)
}
