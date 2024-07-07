package products

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

func (repo Repository) GetProductList() ([]apiContract.Product, error) {
	var products []apiContract.Product
	result := repo.db.Table("products").Where("deleted_at", nil).Find(&products)
	return products, result.Error
}

func (repo Repository) GetProductById(id int64) (apiContract.Product, error) {
	var product apiContract.Product
	result := repo.db.Table("products").Where("id = ?", id).Find(&product)
	return product, result.Error
}

func (repo Repository) CreateProduct(productRequest apiContract.ProductRequest) error {
	result := repo.db.Table("products").Create(productRequest)
	return result.Error
}

func (repo Repository) UpdateProductById(productRequest apiContract.ProductRequest, id int64) error {
	result := repo.db.Table("products").Where(apiContract.Product{Id: id}).Updates(productRequest)
	return result.Error
}

func (repo Repository) DeleteProductById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("products").Where(apiContract.Product{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}
