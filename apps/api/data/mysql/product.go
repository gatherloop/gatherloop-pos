package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/product"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewProductRepository(db *gorm.DB) product.Repository {
	return Repository{db: db}
}

func (repo Repository) GetProductList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]product.Product, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var products []product.Product
	result := db.Table("products").Preload("Category").Preload("Materials").Preload("Materials.Material").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

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

func (repo Repository) GetProductById(ctx context.Context, id int64) (product.Product, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var product product.Product
	result := db.Table("products").Preload("Category").Preload("Materials").Preload("Materials.Material").Where("id = ?", id).First(&product)
	return product, result.Error
}

func (repo Repository) CreateProduct(ctx context.Context, product *product.Product) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("products").Create(product)
	return result.Error
}

func (repo Repository) UpdateProductById(ctx context.Context, product *product.Product, id int64) error {
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

func (repo Repository) CreateProductMaterial(ctx context.Context, productMaterialRequest product.ProductMaterialRequest, productId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	productMaterial := product.ProductMaterial{
		ProductId:  productId,
		MaterialId: productMaterialRequest.MaterialId,
		Amount:     productMaterialRequest.Amount,
	}
	result := db.Table("product_materials").Create(&productMaterial)
	return result.Error
}

func (repo Repository) DeleteProductMaterials(ctx context.Context, productId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("product_materials").Where("product_id = ?", productId).Delete(product.ProductMaterial{})
	return result.Error
}
