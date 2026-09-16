package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewAvailabilityRepository(db *gorm.DB) domain.AvailabilityRepository {
	return Repository{db: db}
}

func (repo Repository) UpdateProductAvailability(ctx context.Context, productId int64, isAvailable *bool, availableQuantity *int) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	updates := map[string]interface{}{}
	if isAvailable != nil {
		updates["is_available"] = *isAvailable
	}
	if availableQuantity != nil {
		updates["available_quantity"] = *availableQuantity
	}

	if len(updates) == 0 {
		return nil
	}

	result := db.Table("products").Where("id = ?", productId).Updates(updates)
	return ToErrorCtx(ctx, result.Error, "UpdateProductAvailability")
}

func (repo Repository) UpdateVariantAvailability(ctx context.Context, variantId int64, isAvailable *bool, availableQuantity *int) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	updates := map[string]interface{}{}
	if isAvailable != nil {
		updates["is_available"] = *isAvailable
	}
	if availableQuantity != nil {
		updates["available_quantity"] = *availableQuantity
	}

	if len(updates) == 0 {
		return nil
	}

	result := db.Table("variants").Where("id = ?", variantId).Updates(updates)
	return ToErrorCtx(ctx, result.Error, "UpdateVariantAvailability")
}

func (repo Repository) CreateAvailabilityMovement(ctx context.Context, movement domain.AvailabilityMovement) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	dbMovement := ToAvailabilityMovementDB(movement)
	result := db.Table("availability_movements").Create(&dbMovement)
	return ToErrorCtx(ctx, result.Error, "CreateAvailabilityMovement")
}

func (repo Repository) GetAvailabilityMovementList(ctx context.Context, level domain.AvailabilityMovementLevel, id int64, skip int, limit int) ([]domain.AvailabilityMovement, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var movements []AvailabilityMovement
	result := db.Table("availability_movements").Where(availabilityMovementLevelColumn(level)+" = ?", id).Order("created_at DESC, id DESC")

	if skip > 0 {
		result = result.Offset(skip)
	}
	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&movements)
	return ToAvailabilityMovementListDomain(movements), ToErrorCtx(ctx, result.Error, "GetAvailabilityMovementList")
}

func (repo Repository) GetAvailabilityMovementListTotal(ctx context.Context, level domain.AvailabilityMovementLevel, id int64) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var count int64
	result := db.Table("availability_movements").Where(availabilityMovementLevelColumn(level)+" = ?", id).Count(&count)
	return count, ToErrorCtx(ctx, result.Error, "GetAvailabilityMovementListTotal")
}

func availabilityMovementLevelColumn(level domain.AvailabilityMovementLevel) string {
	if level == domain.AvailabilityMovementLevelVariant {
		return "variant_id"
	}
	return "product_id"
}
