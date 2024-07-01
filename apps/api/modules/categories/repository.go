package categories

import (
	apiContract "libs/api-contract"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) Repository {
	return Repository{db: db}
}

func (repo Repository) GetCategoryList() ([]apiContract.Category, error) {
	var categories []apiContract.Category
	result := repo.db.Table("categories").Find(&categories)
	return categories, result.Error
}

func (repo Repository) GetCategoryById(id int64) (apiContract.Category, error) {
	var category apiContract.Category
	result := repo.db.Table("categories").Where(apiContract.Category{Id: id}).Find(&category)
	return category, result.Error
}

func (repo Repository) CreateCategory(categoryRequest apiContract.CategoryRequest) error {
	result := repo.db.Table("categories").Create(categoryRequest)
	return result.Error
}

func (repo Repository) UpdateCategoryById(categoryRequest apiContract.CategoryRequest, id int64) error {
	result := repo.db.Table("categories").Where(apiContract.Category{Id: id}).Updates(categoryRequest)
	return result.Error
}
