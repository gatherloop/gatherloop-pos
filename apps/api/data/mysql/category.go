package mysql

import (
	"apps/api/domain/category"
	"apps/api/utils"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewCategoryRepository(db *gorm.DB) category.Repository {
	return Repository{db: db}
}

func (repo Repository) GetCategoryList(ctx context.Context) ([]category.Category, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var categories []category.Category
	result := db.Table("categories").Where("deleted_at", nil).Find(&categories)
	return categories, result.Error
}

func (repo Repository) GetCategoryById(ctx context.Context, id int64) (category.Category, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var category category.Category
	result := db.Table("categories").Where("id = ?", id).First(&category)
	return category, result.Error
}

func (repo Repository) CreateCategory(ctx context.Context, categoryRequest category.CategoryRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Create(categoryRequest)
	return result.Error
}

func (repo Repository) UpdateCategoryById(ctx context.Context, categoryRequest category.CategoryRequest, id int64) error {
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
