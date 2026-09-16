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
