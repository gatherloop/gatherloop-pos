package materials

import (
	"apps/api/utils"
	"context"
	"fmt"
	apiContract "libs/api-contract"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetMaterialList(ctx context.Context, query string, sortBy string, order string, skip int, limit int) ([]apiContract.Material, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var categories []apiContract.Material
	result := db.Table("materials").Where("deleted_at", nil)

	if sortBy != "" && order != "" {
		result = result.Order(fmt.Sprintf("%s %s", sortBy, order))
	}

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

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (apiContract.Material, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var material apiContract.Material
	result := db.Table("materials").Where("id = ?", id).First(&material)
	return material, result.Error
}

func (repo Repository) CreateMaterial(ctx context.Context, materialRequest apiContract.MaterialRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("materials").Create(materialRequest)
	return result.Error
}

func (repo Repository) UpdateMaterialById(ctx context.Context, materialRequest apiContract.MaterialRequest, id int64) error {
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
