package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewStockCheckRepository(db *gorm.DB) domain.StockCheckRepository {
	return Repository{db: db}
}

func (repo Repository) GetStockCheckList(ctx context.Context, sortBy domain.SortBy, order domain.Order, skip int, limit int) ([]domain.StockCheck, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var stockChecks []StockCheck

	result := db.Table("stock_checks").
		Where("deleted_at IS NULL").
		Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}
	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&stockChecks)
	return ToStockCheckListDomain(stockChecks), ToErrorCtx(ctx, result.Error, "GetStockCheckList")
}

func (repo Repository) GetStockCheckListTotal(ctx context.Context) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("stock_checks").Where("deleted_at IS NULL").Count(&count)
	return count, ToErrorCtx(ctx, result.Error, "GetStockCheckListTotal")
}

func (repo Repository) GetStockCheckById(ctx context.Context, id int64) (domain.StockCheck, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var stockCheck StockCheck
	result := db.Table("stock_checks").
		Where("id = ? AND deleted_at IS NULL", id).
		Preload("Items").
		First(&stockCheck)
	return ToStockCheckDomain(stockCheck), ToErrorCtx(ctx, result.Error, "GetStockCheckById")
}

func (repo Repository) GetStockCheckByDate(ctx context.Context, checkDate string) (domain.StockCheck, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var stockCheck StockCheck
	result := db.Table("stock_checks").
		Where("check_date = ? AND deleted_at IS NULL", checkDate).
		First(&stockCheck)
	return ToStockCheckDomain(stockCheck), ToErrorCtx(ctx, result.Error, "GetStockCheckByDate")
}

func (repo Repository) CreateStockCheck(ctx context.Context, stockCheck domain.StockCheck) (domain.StockCheck, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToStockCheckDB(stockCheck)

	if err := db.Table("stock_checks").Create(&payload).Error; err != nil {
		return domain.StockCheck{}, ToErrorCtx(ctx, err, "CreateStockCheck")
	}

	for i := range payload.Items {
		payload.Items[i].StockCheckId = payload.Id
	}
	if len(payload.Items) > 0 {
		if err := db.Table("stock_check_items").Create(&payload.Items).Error; err != nil {
			return domain.StockCheck{}, ToErrorCtx(ctx, err, "CreateStockCheckItems")
		}
	}

	return ToStockCheckDomain(payload), nil
}

func (repo Repository) UpdateStockCheckById(ctx context.Context, stockCheck domain.StockCheck, id int64) (domain.StockCheck, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	updates := map[string]interface{}{
		"note": stockCheck.Note,
	}
	if err := db.Table("stock_checks").Where("id = ?", id).Updates(updates).Error; err != nil {
		return domain.StockCheck{}, ToErrorCtx(ctx, err, "UpdateStockCheckById")
	}

	for _, item := range stockCheck.Items {
		if err := db.Table("stock_check_items").
			Where("id = ?", item.Id).
			Update("current_stock", item.CurrentStock).Error; err != nil {
			return domain.StockCheck{}, ToErrorCtx(ctx, err, "UpdateStockCheckItem")
		}
	}

	return repo.GetStockCheckById(ctx, id)
}

func (repo Repository) DeleteStockCheckById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("stock_checks").Where("id = ?", id).Update("deleted_at", time.Now())
	return ToErrorCtx(ctx, result.Error, "DeleteStockCheckById")
}
