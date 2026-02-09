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
	return ToCategoryListDomain(categories), ToError(result.Error)
}

func (repo Repository) GetCategoryById(ctx context.Context, id int64) (domain.Category, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var category Category
	result := db.Table("categories").Where("id = ?", id).First(&category)
	return ToCategoryDomain(category), ToError(result.Error)
}

func (repo Repository) CreateCategory(ctx context.Context, category *domain.Category) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Create(ToCategoryDB(*category))
	return ToError(result.Error)
}

func (repo Repository) UpdateCategoryById(ctx context.Context, category *domain.Category, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("categories").Where("id = ?", id).Updates(ToCategoryDB(*category))
	return ToError(result.Error)
}

func (repo Repository) DeleteCategoryById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("categories").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
