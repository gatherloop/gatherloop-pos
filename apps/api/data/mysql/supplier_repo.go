package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/supplier"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewSupplierRepository(db *gorm.DB) supplier.Repository {
	return Repository{db: db}
}

func (repo Repository) GetSupplierList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]supplier.Supplier, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var suppliers []Supplier
	result := db.Table("suppliers").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&suppliers)

	return ToSupplierListDomain(suppliers), ToError(result.Error)
}

func (repo Repository) GetSupplierListTotal(ctx context.Context, query string) (int64, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("suppliers").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetSupplierById(ctx context.Context, id int64) (supplier.Supplier, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var supplier Supplier
	result := db.Table("suppliers").Where("id = ?", id).Where("deleted_at", nil).First(&supplier)
	return ToSupplierDomain(supplier), ToError(result.Error)
}

func (repo Repository) CreateSupplier(ctx context.Context, supplier *supplier.Supplier) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	supplierPayload := ToSupplierDB(*supplier)
	result := db.Table("suppliers").Create(&supplierPayload)

	supplier.Id = supplierPayload.Id

	return ToError(result.Error)
}

func (repo Repository) UpdateSupplierById(ctx context.Context, supplier *supplier.Supplier, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	supplierPayload := ToSupplierDB(*supplier)
	result := db.Table("suppliers").Where("id = ?", id).Updates(supplierPayload)
	return ToError(result.Error)
}

func (repo Repository) DeleteSupplierById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("suppliers").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
