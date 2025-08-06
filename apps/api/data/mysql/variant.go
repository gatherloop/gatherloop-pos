package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/variant"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewVariantRepository(db *gorm.DB) variant.Repository {
	return Repository{db: db}
}

func (repo Repository) GetVariantList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]variant.Variant, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var variants []variant.Variant
	result := db.Table("variants").Preload("Product").Preload("Product.Category").Preload("Materials").Preload("Materials.Material").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&variants)

	return variants, ToError(result.Error)
}

func (repo Repository) GetVariantListTotal(ctx context.Context, query string) (int64, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("variants").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetVariantById(ctx context.Context, id int64) (variant.Variant, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var variant variant.Variant
	result := db.Table("variants").Preload("Product").Preload("Product.Category").Preload("Materials").Preload("Materials.Material").Preload("VariantValues").Preload("VariantValues.OptionValue").Where("id = ?", id).First(&variant)
	return variant, ToError(result.Error)
}

func (repo Repository) CreateVariant(ctx context.Context, variant *variant.Variant) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("variants").Create(variant)
	return ToError(result.Error)
}

func (repo Repository) UpdateVariantById(ctx context.Context, variant *variant.Variant, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("variants").Where("id = ?", id).Updates(variant)
	return ToError(result.Error)
}

func (repo Repository) DeleteVariantById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("variants").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) CreateVariantMaterials(ctx context.Context, variantMaterials []variant.VariantMaterial) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("variant_materials").Create(&variantMaterials)
	return ToError(result.Error)
}

func (repo Repository) DeleteVariantMaterialById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("variant_materials").Where("id = ?", id).Delete(variant.VariantMaterial{})
	return ToError(result.Error)
}

func (repo Repository) DeleteUnusedValues(ctx context.Context, variantId int64, idsToKeep []int64) *base.Error {
	if len(idsToKeep) > 0 {
		db := GetDbFromCtx(ctx, repo.db)
		return ToError(db.Where("variant_id = ? AND id NOT IN ?", variantId, idsToKeep).Delete(&variant.VariantValue{}).Error)
	} else {
		return nil
	}
}
