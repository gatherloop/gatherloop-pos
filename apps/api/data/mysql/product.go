package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/product"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewProductRepository(db *gorm.DB) product.Repository {
	return Repository{db: db}
}

func (repo Repository) GetProductList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]product.Product, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var products []product.Product
	result := db.Table("products").Preload("Category").Preload("Options").Preload("Options.Values").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

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

	return products, ToError(result.Error)
}

func (repo Repository) GetProductListTotal(ctx context.Context, query string) (int64, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("products").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetProductById(ctx context.Context, id int64) (product.Product, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var product product.Product
	result := db.Table("products").Preload("Category").Preload("Options").Preload("Options.Values").Where("id = ?", id).First(&product)
	return product, ToError(result.Error)
}

func (repo Repository) CreateProduct(ctx context.Context, product *product.Product) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("products").Create(product)
	return ToError(result.Error)
}

func (repo Repository) UpdateProductById(ctx context.Context, product *product.Product, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("products").Where("id = ?", id).Updates(product)
	return ToError(result.Error)
}

func (repo Repository) DeleteProductById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("products").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) DeleteUnusedOptions(ctx context.Context, productId int64, idsToKeep []int64) *base.Error {
	if len(idsToKeep) > 0 {
		db := GetDbFromCtx(ctx, repo.db)
		return ToError(db.Where("product_id = ? AND id NOT IN ?", productId, idsToKeep).Delete(&product.Option{}).Error)
	} else {
		return nil
	}
}

func (repo Repository) DeleteUnusedOptionValues(ctx context.Context, optionId int64, idsToKeep []int64) *base.Error {
	if len(idsToKeep) > 0 {
		db := GetDbFromCtx(ctx, repo.db)
		return ToError(db.Where("option_id = ? AND id NOT IN ?", optionId, idsToKeep).Delete(&product.OptionValue{}).Error)
	} else {
		return nil
	}
}
