package categories

import (
	"apps/api/utils"
	"context"
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

func (repo Repository) GetCategoryList(ctx context.Context) ([]apiContract.Category, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var categories []apiContract.Category
	result := db.Table("categories").Where("deleted_at", nil).Find(&categories)
	return categories, result.Error
}

func (repo Repository) GetCategoryById(ctx context.Context, id int64) (apiContract.Category, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var category apiContract.Category
	result := db.Table("categories").Where("id = ?", id).First(&category)
	return category, result.Error
}

func (repo Repository) CreateCategory(ctx context.Context, categoryRequest apiContract.CategoryRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Create(categoryRequest)
	return result.Error
}

func (repo Repository) UpdateCategoryById(ctx context.Context, categoryRequest apiContract.CategoryRequest, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Where("id = ?", id).Updates(categoryRequest)
	return result.Error
}

func (repo Repository) DeleteCategoryById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("categories").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}
