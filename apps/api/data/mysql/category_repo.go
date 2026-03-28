package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewCategoryRepository(db *gorm.DB) domain.CategoryRepository {
	return Repository{db: db}
}

func (repo Repository) GetCategoryList(ctx context.Context) ([]domain.Category, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var categories []Category
	result := db.Table("categories").Where("deleted_at", nil).Find(&categories)
	return ToCategoryListDomain(categories), ToErrorCtx(ctx, result.Error, "GetCategoryList")
}

func (repo Repository) GetCategoryById(ctx context.Context, id int64) (domain.Category, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var category Category
	result := db.Table("categories").Where("id = ?", id).First(&category)
	return ToCategoryDomain(category), ToErrorCtx(ctx, result.Error, "GetCategoryById")
}

func (repo Repository) CreateCategory(ctx context.Context, category domain.Category) (domain.Category, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	categoryPayload := ToCategoryDB(category)
	result := db.Table("categories").Create(&categoryPayload)
	return ToCategoryDomain(categoryPayload), ToErrorCtx(ctx, result.Error, "CreateCategory")
}

func (repo Repository) UpdateCategoryById(ctx context.Context, category domain.Category, id int64) (domain.Category, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	categoryPayload := ToCategoryDB(category)
	if result := db.Table("categories").Where("id = ?", id).Updates(&categoryPayload); result.Error != nil {
		return domain.Category{}, ToErrorCtx(ctx, result.Error, "UpdateCategoryById")
	}

	var updatedCategory Category
	fetchResult := db.Table("categories").Where("id = ?", id).First(&updatedCategory)
	return ToCategoryDomain(updatedCategory), ToErrorCtx(ctx, fetchResult.Error, "UpdateCategoryById")
}

func (repo Repository) DeleteCategoryById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("categories").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteCategoryById")
}
