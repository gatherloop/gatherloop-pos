package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewSupplierRepository(db *gorm.DB) domain.SupplierRepository {
	return Repository{db: db}
}

func (repo Repository) GetSupplierList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int) ([]domain.Supplier, *domain.Error) {
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

	return ToSupplierListDomain(suppliers), ToErrorCtx(ctx, result.Error, "GetSupplierList")
}

func (repo Repository) GetSupplierListTotal(ctx context.Context, query string) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("suppliers").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToErrorCtx(ctx, result.Error, "GetSupplierListTotal")
}

func (repo Repository) GetSupplierById(ctx context.Context, id int64) (domain.Supplier, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var supplier Supplier
	result := db.Table("suppliers").Where("id = ?", id).Where("deleted_at", nil).First(&supplier)
	return ToSupplierDomain(supplier), ToErrorCtx(ctx, result.Error, "GetSupplierById")
}

func (repo Repository) CreateSupplier(ctx context.Context, supplier domain.Supplier) (domain.Supplier, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	supplierPayload := ToSupplierDB(supplier)
	result := db.Table("suppliers").Create(&supplierPayload)
	return ToSupplierDomain(supplierPayload), ToErrorCtx(ctx, result.Error, "CreateSupplier")
}

func (repo Repository) UpdateSupplierById(ctx context.Context, supplier domain.Supplier, id int64) (domain.Supplier, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	supplierPayload := ToSupplierDB(supplier)
	if result := db.Table("suppliers").Where("id = ?", id).Updates(&supplierPayload); result.Error != nil {
		return domain.Supplier{}, ToErrorCtx(ctx, result.Error, "UpdateSupplierById")
	}

	var updatedSupplier Supplier
	result := db.Table("suppliers").Where("id = ?", id).First(&updatedSupplier)
	return ToSupplierDomain(updatedSupplier), ToErrorCtx(ctx, result.Error, "UpdateSupplierById")
}

func (repo Repository) DeleteSupplierById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("suppliers").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteSupplierById")
}
