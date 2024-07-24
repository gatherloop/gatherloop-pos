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
	result := repo.db.Model(&apiContract.Product{}).Preload("Category").Preload("Materials").Preload("Materials.Material").Where("deleted_at", nil).Find(&products)
	return products, result.Error
}

func (repo Repository) GetProductById(id int64) (apiContract.Product, error) {
	var product apiContract.Product
	result := repo.db.Model(&apiContract.Product{}).Preload("Category").Preload("Materials").Preload("Materials.Material").Where("id = ?", id).Find(&product)
	return product, result.Error
}

func (repo Repository) CreateProduct(product *apiContract.Product) error {
	result := repo.db.Table("products").Create(product)
	return result.Error
}

func (repo Repository) UpdateProductById(product *apiContract.Product, id int64) error {
	result := repo.db.Table("products").Where(apiContract.Product{Id: id}).Updates(product)
	return result.Error
}

func (repo Repository) DeleteProductById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("products").Where(apiContract.Product{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) CreateProductMaterial(productMaterialRequest apiContract.ProductMaterialRequest, productId int64) error {
	productMaterial := apiContract.ProductMaterial{
		ProductId:  productId,
		MaterialId: productMaterialRequest.MaterialId,
		Amount:     productMaterialRequest.Amount,
	}
	result := repo.db.Table("product_materials").Create(&productMaterial)
	return result.Error
}

func (repo Repository) DeleteProductMaterials(productId int64) error {
	result := repo.db.Table("product_materials").Where("product_id = ?", productId).Delete(apiContract.ProductMaterial{})
	return result.Error
}
