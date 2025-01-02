package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/material"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewMaterialRepository(db *gorm.DB) material.Repository {
	return Repository{db: db}
}

func (repo Repository) GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]material.Material, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
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

	return categories, result.Error
}

func (repo Repository) GetMaterialListTotal(ctx context.Context, query string) (int64, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("materials").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, result.Error
}

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (material.Material, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var material material.Material
	result := db.Table("materials").Where("id = ?", id).First(&material)
	return material, result.Error
}

func (repo Repository) CreateMaterial(ctx context.Context, materialRequest material.MaterialRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Create(materialRequest)
	return result.Error
}

func (repo Repository) UpdateMaterialById(ctx context.Context, materialRequest material.MaterialRequest, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Where("id = ?", id).Updates(materialRequest)
	return result.Error
}

func (repo Repository) DeleteMaterialById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}
