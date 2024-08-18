package products

import (
	"apps/api/utils"
	"context"
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

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetProductList(ctx context.Context, query string, sortBy string, order string, skip int, limit int) ([]apiContract.Product, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var products []apiContract.Product
	result := db.Table("products").Preload("Category").Preload("Materials").Preload("Materials.Material").Where("deleted_at", nil)

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

	result = result.Find(&products)

	return products, result.Error
}

func (repo Repository) GetProductById(ctx context.Context, id int64) (apiContract.Product, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var product apiContract.Product
	result := db.Table("products").Preload("Category").Preload("Materials").Preload("Materials.Material").Where("id = ?", id).First(&product)
	return product, result.Error
}

func (repo Repository) CreateProduct(ctx context.Context, product *apiContract.Product) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("products").Create(product)
	return result.Error
}

func (repo Repository) UpdateProductById(ctx context.Context, product *apiContract.Product, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("products").Where("id = ?", id).Updates(product)
	return result.Error
}

func (repo Repository) DeleteProductById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("products").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) CreateProductMaterial(ctx context.Context, productMaterialRequest apiContract.ProductMaterialRequest, productId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	productMaterial := apiContract.ProductMaterial{
		ProductId:  productId,
		MaterialId: productMaterialRequest.MaterialId,
		Amount:     productMaterialRequest.Amount,
	}
	result := db.Table("product_materials").Create(&productMaterial)
	return result.Error
}

func (repo Repository) DeleteProductMaterials(ctx context.Context, productId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("product_materials").Where("product_id = ?", productId).Delete(apiContract.ProductMaterial{})
	return result.Error
}
