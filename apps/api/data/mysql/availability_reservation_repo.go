package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewAvailabilityReservationRepository(db *gorm.DB) domain.AvailabilityReservationRepository {
	return Repository{db: db}
}

func (repo Repository) LockVariantById(ctx context.Context, id int64) (domain.Variant, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var variant Variant
	result := db.Table("variants").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Product").
		Where("id = ?", id).
		First(&variant)
	return ToVariantDomain(variant), ToErrorCtx(ctx, result.Error, "LockVariantById")
}

func (repo Repository) LockProductById(ctx context.Context, id int64) (domain.Product, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var product Product
	result := db.Table("products").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", id).
		First(&product)
	return ToProductDomain(product), ToErrorCtx(ctx, result.Error, "LockProductById")
}

func (repo Repository) UpdateVariantAvailableQuantity(ctx context.Context, id int64, quantity int) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("variants").Where("id = ?", id).Update("available_quantity", quantity)
	return ToErrorCtx(ctx, result.Error, "UpdateVariantAvailableQuantity")
}

func (repo Repository) UpdateProductAvailableQuantity(ctx context.Context, id int64, quantity int) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("products").Where("id = ?", id).Update("available_quantity", quantity)
	return ToErrorCtx(ctx, result.Error, "UpdateProductAvailableQuantity")
}
