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
	result := repo.db.Model(&apiContract.Product{}).Preload("Category").Where("deleted_at", nil).Find(&products)
	return products, result.Error
}

func (repo Repository) GetProductById(id int64) (apiContract.Product, error) {
	var product apiContract.Product
	result := repo.db.Model(&apiContract.Product{}).Preload("Category").Where("id = ?", id).Find(&product)
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

func (repo Repository) GetProductMaterialList(productId int64) ([]apiContract.ProductMaterial, error) {
	var productMaterials []apiContract.ProductMaterial
	result := repo.db.Model(&apiContract.ProductMaterial{}).Preload("Material").Where("product_id = ? AND deleted_at is NULL", productId).Find(&productMaterials)
	return productMaterials, result.Error
}

func (repo Repository) GetProductMaterialById(id int64) (apiContract.ProductMaterial, error) {
	var productMaterial apiContract.ProductMaterial
	result := repo.db.Model(&apiContract.ProductMaterial{}).Preload("Material").Where("id = ?", id).Find(&productMaterial)
	return productMaterial, result.Error
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

func (repo Repository) UpdateProductMaterialById(productMaterialRequest apiContract.ProductMaterialRequest, productMaterialId int64) error {
	result := repo.db.Table("product_materials").Where(apiContract.Product{Id: productMaterialId}).Updates(productMaterialRequest)
	return result.Error
}

func (repo Repository) DeleteProductMaterialById(productMaterialId int64) error {
	currentTime := time.Now()
	result := repo.db.Table("product_materials").Where(apiContract.Product{Id: productMaterialId}).Update("deleted_at", currentTime)
	return result.Error
}
