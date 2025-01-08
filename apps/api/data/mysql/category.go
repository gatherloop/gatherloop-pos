package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/category"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewCategoryRepository(db *gorm.DB) category.Repository {
	return Repository{db: db}
}

func (repo Repository) GetCategoryList(ctx context.Context) ([]category.Category, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var categories []category.Category
	result := db.Table("categories").Where("deleted_at", nil).Find(&categories)
	return categories, ToError(result.Error)
}

func (repo Repository) GetCategoryById(ctx context.Context, id int64) (category.Category, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var category category.Category
	result := db.Table("categories").Where("id = ?", id).First(&category)
	return category, ToError(result.Error)
}

func (repo Repository) CreateCategory(ctx context.Context, categoryRequest category.CategoryRequest) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Create(categoryRequest)
	return ToError(result.Error)
}

func (repo Repository) UpdateCategoryById(ctx context.Context, categoryRequest category.CategoryRequest, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Where("id = ?", id).Updates(categoryRequest)
	return ToError(result.Error)
}

func (repo Repository) DeleteCategoryById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("categories").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
