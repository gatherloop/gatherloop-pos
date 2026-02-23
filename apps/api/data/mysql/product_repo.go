package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewProductRepository(db *gorm.DB) domain.ProductRepository {
	return Repository{db: db}
}

func (repo Repository) GetProductList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int, saleType *domain.SaleType) ([]domain.Product, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var products []Product
	result := db.Table("products").Preload("Category").Preload("Options").Preload("Options.Values").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if saleType != nil {
		switch *saleType {
		case domain.SaleTypePurchase:
			result = result.Where("sale_type = 'purchase'")
		case domain.SaleTypeRental:
			result = result.Where("sale_type = 'rental'")
		}
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&products)

	return ToProductListDomain(products), ToError(result.Error)
}

func (repo Repository) GetProductListTotal(ctx context.Context, query string, saleType *domain.SaleType) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("products").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if saleType != nil {
		switch *saleType {
		case domain.SaleTypePurchase:
			result = result.Where("sale_type = 'purchase'")
		case domain.SaleTypeRental:
			result = result.Where("sale_type = 'rental'")
		}
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetProductById(ctx context.Context, id int64) (domain.Product, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var product Product
	result := db.Table("products").Preload("Category").Preload("Options").Preload("Options.Values").Where("id = ?", id).First(&product)
	return ToProductDomain(product), ToError(result.Error)
}

func (repo Repository) CreateProduct(ctx context.Context, product domain.Product) (domain.Product, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToProductDB(product)
	if result := db.Table("products").Create(&payload); result.Error != nil {
		return domain.Product{}, ToError(result.Error)
	}

	// Fetch the created product with all relations
	var createdProduct Product
	fetchResult := db.Table("products").Preload("Category").Preload("Options").Preload("Options.Values").Where("id = ?", payload.Id).First(&createdProduct)
	return ToProductDomain(createdProduct), ToError(fetchResult.Error)
}

func (repo Repository) UpdateProductById(ctx context.Context, product domain.Product, id int64) (domain.Product, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	product.Id = id

	// update product
	productPayload := ToProductDB(product)
	if result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("products").Where("id = ?", id).Updates(&productPayload); result.Error != nil {
		return domain.Product{}, ToError(result.Error)
	}

	// Collect IDs of options and option values that should be kept (those that are present in the incoming payload)
	optionIdsToKeep := []int64{}
	optionValueIdsToKeep := []int64{}
	for _, opt := range productPayload.Options {
		if opt.Id > 0 {
			optionIdsToKeep = append(optionIdsToKeep, opt.Id)
		}
		for _, val := range opt.Values {
			if val.Id > 0 {
				optionValueIdsToKeep = append(optionValueIdsToKeep, val.Id)
			}
		}
	}

	if len(optionIdsToKeep) > 0 {
		// delete items that were present before but are not in the incoming idsToKeep
		if err := db.Table("options").Where("product_id = ? AND id NOT IN ?", id, optionIdsToKeep).Delete(&Option{}).Error; err != nil {
			return domain.Product{}, ToError(err)
		}
	} else {
		// If incoming payload has no existing IDs, remove all previously existing items
		if err := db.Table("options").Where("product_id = ?", id).Delete(&Option{}).Error; err != nil {
			return domain.Product{}, ToError(err)
		}
	}

	if len(optionValueIdsToKeep) > 0 {
		// delete items that were present before but are not in the incoming idsToKeep
		if err := db.Table("option_values").Where("option_id IN (SELECT id FROM options WHERE product_id = ?) AND id NOT IN ?", id, optionValueIdsToKeep).Delete(&OptionValue{}).Error; err != nil {
			return domain.Product{}, ToError(err)
		}
	} else {
		// If incoming payload has no existing IDs, remove all previously existing items
		if err := db.Table("option_values").Where("option_id IN (SELECT id FROM options WHERE product_id = ?)", id).Delete(&OptionValue{}).Error; err != nil {
			return domain.Product{}, ToError(err)
		}
	}

	// Fetch the updated product with all relations
	var updatedProduct Product
	fetchResult := db.Table("products").Preload("Category").Preload("Options").Preload("Options.Values").Where("id = ?", id).First(&updatedProduct)
	return ToProductDomain(updatedProduct), ToError(fetchResult.Error)
}

func (repo Repository) DeleteProductById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("products").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) DeleteUnusedOptions(ctx context.Context, productId int64, idsToKeep []int64) *domain.Error {
	if len(idsToKeep) > 0 {
		db := GetDbFromCtx(ctx, repo.db)
		return ToError(db.Where("product_id = ? AND id NOT IN ?", productId, idsToKeep).Delete(&domain.Option{}).Error)
	} else {
		return nil
	}
}

func (repo Repository) DeleteUnusedOptionValues(ctx context.Context, optionId int64, idsToKeep []int64) *domain.Error {
	if len(idsToKeep) > 0 {
		db := GetDbFromCtx(ctx, repo.db)
		return ToError(db.Where("option_id = ? AND id NOT IN ?", optionId, idsToKeep).Delete(&domain.OptionValue{}).Error)
	} else {
		return nil
	}
}
