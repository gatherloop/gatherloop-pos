package products_mysql

import (
	"apps/api/domain/products"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) products.Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetProductList(ctx context.Context, query string, sortBy string, order string, skip int, limit int) ([]products.Product, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var products []products.Product
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

func (repo Repository) GetProductListTotal(ctx context.Context, query string) (int64, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("products").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, result.Error
}

func (repo Repository) GetProductById(ctx context.Context, id int64) (products.Product, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var product products.Product
	result := db.Table("products").Preload("Category").Preload("Materials").Preload("Materials.Material").Where("id = ?", id).First(&product)
	return product, result.Error
}

func (repo Repository) CreateProduct(ctx context.Context, product *products.Product) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("products").Create(product)
	return result.Error
}

func (repo Repository) UpdateProductById(ctx context.Context, product *products.Product, id int64) error {
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

func (repo Repository) CreateProductMaterial(ctx context.Context, productMaterialRequest products.ProductMaterialRequest, productId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	productMaterial := products.ProductMaterial{
		ProductId:  productId,
		MaterialId: productMaterialRequest.MaterialId,
		Amount:     productMaterialRequest.Amount,
	}
	result := db.Table("product_materials").Create(&productMaterial)
	return result.Error
}

func (repo Repository) DeleteProductMaterials(ctx context.Context, productId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("product_materials").Where("product_id = ?", productId).Delete(products.ProductMaterial{})
	return result.Error
}
