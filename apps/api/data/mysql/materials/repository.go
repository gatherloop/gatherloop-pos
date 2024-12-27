package materials_mysql

import (
	base_mysql "apps/api/data/mysql/base"
	"apps/api/domain/base"
	"apps/api/domain/materials"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) materials.Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]materials.Material, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var categories []materials.Material
	result := db.Table("materials").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", base_mysql.ToSortByColumn(sortBy), base_mysql.ToOrderColumn(order)))

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

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (materials.Material, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var material materials.Material
	result := db.Table("materials").Where("id = ?", id).First(&material)
	return material, result.Error
}

func (repo Repository) CreateMaterial(ctx context.Context, materialRequest materials.MaterialRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Create(materialRequest)
	return result.Error
}

func (repo Repository) UpdateMaterialById(ctx context.Context, materialRequest materials.MaterialRequest, id int64) error {
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
