package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewVariantRepository(db *gorm.DB) domain.VariantRepository {
	return Repository{db: db}
}

func (repo Repository) GetVariantList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int, productId *int, optionValueIds []int) ([]domain.Variant, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var variants []Variant
	result := db.Table("variants").Preload("Product").Preload("Product.Category").Preload("Materials").Preload("Materials.Material").Preload("VariantValues").Preload("VariantValues.OptionValue").Where("variants.deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if len(optionValueIds) > 0 {
		result = result.Joins("JOIN variant_values ON variant_values.variant_id = variants.id").Where("variant_values.option_value_id IN ?", optionValueIds).Group("variants.id").Having("COUNT(*) = ?", len(optionValueIds))
	}

	if query != "" {
		result = result.Where("variants.name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	if productId != nil {
		result = result.Where("variants.product_id = ?", productId)
	}

	result = result.Find(&variants)

	return ToVariantsListDomain(variants), ToError(result.Error)
}

func (repo Repository) GetVariantListTotal(ctx context.Context, query string) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("variants").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetVariantById(ctx context.Context, id int64) (domain.Variant, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var variant Variant
	result := db.Table("variants").Preload("Product").Preload("Product.Category").Preload("Materials").Preload("Materials.Material").Preload("VariantValues").Preload("VariantValues.OptionValue").Where("id = ?", id).First(&variant)
	return ToVariantDomain(variant), ToError(result.Error)
}

func (repo Repository) CreateVariant(ctx context.Context, variant *domain.Variant) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("variants").Create(ToVariantDB(*variant))
	return ToError(result.Error)
}

func (repo Repository) UpdateVariantById(ctx context.Context, variant *domain.Variant, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("variants").Where("id = ?", id).Updates(ToVariantDB(*variant))
	return ToError(result.Error)
}

func (repo Repository) DeleteVariantById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("variants").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) CreateVariantMaterials(ctx context.Context, variantMaterials []domain.VariantMaterial) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("variant_materials").Create(ToVariantMaterialListDB(variantMaterials))
	return ToError(result.Error)
}

func (repo Repository) DeleteVariantMaterialById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("variant_materials").Where("id = ?", id).Delete(domain.VariantMaterial{})
	return ToError(result.Error)
}

func (repo Repository) DeleteUnusedValues(ctx context.Context, variantId int64, idsToKeep []int64) *domain.Error {
	if len(idsToKeep) > 0 {
		db := GetDbFromCtx(ctx, repo.db)
		return ToError(db.Where("variant_id = ? AND id NOT IN ?", variantId, idsToKeep).Delete(&domain.VariantValue{}).Error)
	} else {
		return nil
	}
}
