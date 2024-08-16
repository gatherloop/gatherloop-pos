package categories

import (
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

func (repo Repository) GetCategoryList() ([]apiContract.Category, error) {
	var categories []apiContract.Category
	result := repo.db.Table("categories").Where("deleted_at", nil).Find(&categories)
	return categories, result.Error
}

func (repo Repository) GetCategoryById(id int64) (apiContract.Category, error) {
	var category apiContract.Category
	result := repo.db.Table("categories").Where("id = ?", id).First(&category)
	return category, result.Error
}

func (repo Repository) CreateCategory(categoryRequest apiContract.CategoryRequest) error {
	result := repo.db.Table("categories").Create(categoryRequest)
	return result.Error
}

func (repo Repository) UpdateCategoryById(categoryRequest apiContract.CategoryRequest, id int64) error {
	result := repo.db.Table("categories").Where("id = ?", id).Updates(categoryRequest)
	return result.Error
}

func (repo Repository) DeleteCategoryById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("categories").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}
