package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/material"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type MaterialUsage struct {
	ID     int64   `gorm:"column:id"`
	Amount float32 `gorm:"column:amount"`
}

func NewMaterialRepository(db *gorm.DB) material.Repository {
	return Repository{db: db}
}

func (repo Repository) GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]material.Material, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var categories []material.Material
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

	result = result.Find(&categories)

	return categories, ToError(result.Error)
}

func (repo Repository) GetMaterialListTotal(ctx context.Context, query string) (int64, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("materials").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetMaterialsWeeklyUsage(ctx context.Context, ids []int64) (map[int64]float32, *base.Error) {
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

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (material.Material, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var material material.Material
	result := db.Table("materials").Where("id = ?", id).First(&material)
	return material, ToError(result.Error)
}

func (repo Repository) CreateMaterial(ctx context.Context, material *material.Material) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Create(material)
	return ToError(result.Error)
}

func (repo Repository) UpdateMaterialById(ctx context.Context, material *material.Material, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Where("id = ?", id).Updates(material)
	return ToError(result.Error)
}

func (repo Repository) DeleteMaterialById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
