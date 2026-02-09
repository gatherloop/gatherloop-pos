package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewMaterialRepository(db *gorm.DB) domain.MaterialRepository {
	return Repository{db: db}
}

func (repo Repository) GetMaterialList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int) ([]domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var materials []Material
	result := db.Table("materials").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&materials)

	return ToMaterialListDomain(materials), ToError(result.Error)
}

func (repo Repository) GetMaterialListTotal(ctx context.Context, query string) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("materials").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetMaterialsWeeklyUsage(ctx context.Context, ids []int64) (map[int64]float32, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -14)

	var results []MaterialUsage

	err := db.
		Table("materials").
		Select(`
			materials.id,
			SUM(variant_materials.amount * transaction_items.amount) / 2 AS amount
		`).
		Joins("JOIN variant_materials ON materials.id = variant_materials.material_id").
		Joins("JOIN transaction_items ON variant_materials.variant_id = transaction_items.variant_id").
		Joins("JOIN transactions ON transaction_items.transaction_id = transactions.id").
		Where("transactions.created_at BETWEEN ? AND ?", startDate, endDate).
		Where("materials.id IN ?", ids).
		Group("materials.id").
		Scan(&results).Error

	if err != nil {
		return nil, ToError(err)
	}

	usageMap := make(map[int64]float32)
	for _, r := range results {
		usageMap[r.ID] = r.Amount
	}

	return usageMap, nil
}

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var material Material
	result := db.Table("materials").Where("id = ?", id).Where("deleted_at", nil).First(&material)
	return ToMaterialDomain(material), ToError(result.Error)
}

func (repo Repository) CreateMaterial(ctx context.Context, material *domain.Material) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	materialPayload := ToMaterialDB(*material)
	result := db.Table("materials").Create(&materialPayload)

	material.Id = materialPayload.Id

	return ToError(result.Error)
}

func (repo Repository) UpdateMaterialById(ctx context.Context, material *domain.Material, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	materialPayload := ToMaterialDB(*material)
	result := db.Table("materials").Where("id = ?", id).Updates(materialPayload)
	return ToError(result.Error)
}

func (repo Repository) DeleteMaterialById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
