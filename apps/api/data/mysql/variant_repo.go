package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
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

func (repo Repository) CreateVariant(ctx context.Context, variant domain.Variant) (domain.Variant, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToVariantDB(variant)
	if result := db.Table("variants").Create(&payload); result.Error != nil {
		return domain.Variant{}, ToError(result.Error)
	}

	// Fetch the created variant with all relations
	var createdVariant Variant
	fetchResult := db.Table("variants").Preload("Product").Preload("Product.Category").Preload("Materials").Preload("Materials.Material").Preload("VariantValues").Preload("VariantValues.OptionValue").Where("id = ?", payload.Id).First(&createdVariant)
	return ToVariantDomain(createdVariant), ToError(fetchResult.Error)
}

func (repo Repository) UpdateVariantById(ctx context.Context, variant domain.Variant, id int64) (domain.Variant, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	variant.Id = id

	// Update the variant and its associations using FullSaveAssociations to ensure all related records are updated
	variantPayload := ToVariantDB(variant)
	if result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("variants").Where("id = ?", id).Updates(&variantPayload); result.Error != nil {
		return domain.Variant{}, ToError(result.Error)
	}

	// Handle deletion of removed materials
	variantMaterialIdsToKeep := []int64{}
	for _, variantMaterial := range variantPayload.Materials {
		variantMaterialIdsToKeep = append(variantMaterialIdsToKeep, variantMaterial.Id)
	}
	if len(variantMaterialIdsToKeep) > 0 {
		if result := db.Table("variant_materials").Where("variant_id = ? AND id NOT IN ?", id, variantMaterialIdsToKeep).Delete(&VariantMaterial{}); result.Error != nil {
			return domain.Variant{}, ToError(result.Error)
		}
	} else {
		if result := db.Table("variant_materials").Where("variant_id = ?", id).Delete(&VariantMaterial{}); result.Error != nil {
			return domain.Variant{}, ToError(result.Error)
		}
	}

	// Handle deletion of removed variant values
	variantValueIdsToKeep := []int64{}
	for _, variantValue := range variantPayload.VariantValues {
		variantValueIdsToKeep = append(variantValueIdsToKeep, variantValue.Id)
	}
	if len(variantValueIdsToKeep) > 0 {
		if result := db.Table("variant_values").Where("variant_id = ? AND id NOT IN ?", id, variantValueIdsToKeep).Delete(&VariantValue{}); result.Error != nil {
			return domain.Variant{}, ToError(result.Error)
		}
	} else {
		if result := db.Table("variant_values").Where("variant_id = ?", id).Delete(&VariantValue{}); result.Error != nil {
			return domain.Variant{}, ToError(result.Error)
		}
	}

	// Fetch the updated variant with all relations
	var updatedVariant Variant
	fetchResult := db.Table("variants").Preload("Product").Preload("Product.Category").Preload("Materials").Preload("Materials.Material").Preload("VariantValues").Preload("VariantValues.OptionValue").Where("id = ?", id).First(&updatedVariant)
	return ToVariantDomain(updatedVariant), ToError(fetchResult.Error)
}

func (repo Repository) DeleteVariantById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("variants").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
