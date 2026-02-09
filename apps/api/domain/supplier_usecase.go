package domain

import (
	"context"
)

type SupplierUsecase struct {
	repository SupplierRepository
}

func NewSupplierUsecase(repository SupplierRepository) SupplierUsecase {
	return SupplierUsecase{repository: repository}
}

func (usecase SupplierUsecase) GetSupplierList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int) ([]Supplier, int64, *Error) {
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

func (usecase SupplierUsecase) GetSupplierById(ctx context.Context, id int64) (Supplier, *Error) {
	supplier, err := usecase.repository.GetSupplierById(ctx, id)
	if err != nil {
		return Supplier{}, err
	}

	return supplier, nil
}

func (usecase SupplierUsecase) CreateSupplier(ctx context.Context, supplier Supplier) *Error {
	return usecase.repository.CreateSupplier(ctx, &supplier)
}

func (usecase SupplierUsecase) UpdateSupplierById(ctx context.Context, supplier Supplier, id int64) *Error {
	return usecase.repository.UpdateSupplierById(ctx, &supplier, id)
}

func (usecase SupplierUsecase) DeleteSupplierById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteSupplierById(ctx, id)
}
