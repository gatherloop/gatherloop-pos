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
	result := repo.db.Model(apiContract.Category{}).Find(&categories)
	return categories, result.Error
}
