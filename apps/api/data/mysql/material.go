package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/material"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

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

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (material.Material, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var material material.Material
	result := db.Table("materials").Where("id = ?", id).First(&material)
	return material, ToError(result.Error)
}

func (repo Repository) CreateMaterial(ctx context.Context, materialRequest material.Material) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Create(materialRequest)
	return ToError(result.Error)
}

func (repo Repository) UpdateMaterialById(ctx context.Context, materialRequest material.Material, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Where("id = ?", id).Updates(materialRequest)
	return ToError(result.Error)
}

func (repo Repository) DeleteMaterialById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
