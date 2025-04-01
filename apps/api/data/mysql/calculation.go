package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/calculation"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewCalculationRepository(db *gorm.DB) calculation.Repository {
	return Repository{db: db}
}

func (repo Repository) GetCalculationList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]calculation.Calculation, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var calculations []calculation.Calculation
	result := db.Table("calculations").Where("deleted_at is NULL").Preload("CalculationItems").Preload("Wallet").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&calculations)

	return calculations, ToError(result.Error)
}

func (repo Repository) GetCalculationById(ctx context.Context, id int64) (calculation.Calculation, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var calculation calculation.Calculation
	result := db.Table("calculations").Where("id = ?", id).Preload("CalculationItems").Preload("Wallet").First(&calculation)
	return calculation, ToError(result.Error)
}

func (repo Repository) CreateCalculation(ctx context.Context, calculation *calculation.Calculation) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("calculations").Create(calculation)
	return ToError(result.Error)
}

func (repo Repository) UpdateCalculationById(ctx context.Context, calculation *calculation.Calculation, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("calculations").Where("id = ?", id).Updates(calculation)
	return ToError(result.Error)
}

func (repo Repository) DeleteCalculationById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("calculations").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) CreateCalculationItems(ctx context.Context, calculationItems []calculation.CalculationItem) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("calculation_items").Create(calculationItems)
	return ToError(result.Error)
}

func (repo Repository) DeleteCalculationItemById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("calculation_items").Where("id = ?", id).Delete(&calculation.Calculation{})
	return ToError(result.Error)
}
