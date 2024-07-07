package materials

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

func (repo Repository) GetMaterialList() ([]apiContract.Material, error) {
	var categories []apiContract.Material
	result := repo.db.Table("materials").Where("deleted_at", nil).Find(&categories)
	return categories, result.Error
}

func (repo Repository) GetMaterialById(id int64) (apiContract.Material, error) {
	var material apiContract.Material
	result := repo.db.Table("materials").Where("id = ?", id).Find(&material)
	return material, result.Error
}

func (repo Repository) CreateMaterial(materialRequest apiContract.MaterialRequest) error {
	result := repo.db.Table("materials").Create(materialRequest)
	return result.Error
}

func (repo Repository) UpdateMaterialById(materialRequest apiContract.MaterialRequest, id int64) error {
	result := repo.db.Table("materials").Where(apiContract.Material{Id: id}).Updates(materialRequest)
	return result.Error
}

func (repo Repository) DeleteMaterialById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("materials").Where(apiContract.Material{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}
