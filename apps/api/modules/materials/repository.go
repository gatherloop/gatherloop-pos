package materials

import (
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

func (repo Repository) GetMaterialList(query string, sortBy string, order string, skip int, limit int) ([]apiContract.Material, error) {
	var categories []apiContract.Material
	result := repo.db.Table("materials").Where("deleted_at", nil)

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

func (repo Repository) GetMaterialById(id int64) (apiContract.Material, error) {
	var material apiContract.Material
	result := repo.db.Table("materials").Where("id = ?", id).First(&material)
	return material, result.Error
}

func (repo Repository) CreateMaterial(materialRequest apiContract.MaterialRequest) error {
	result := repo.db.Table("materials").Create(materialRequest)
	return result.Error
}

func (repo Repository) UpdateMaterialById(materialRequest apiContract.MaterialRequest, id int64) error {
	result := repo.db.Table("materials").Where("id = ?", id).Updates(materialRequest)
	return result.Error
}

func (repo Repository) DeleteMaterialById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}
