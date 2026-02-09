package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewCalculationRepository(db *gorm.DB) domain.CalculationRepository {
	return Repository{db: db}
}

func (repo Repository) GetCalculationList(ctx context.Context, sortBy domain.SortBy, order domain.Order, skip int, limit int) ([]domain.Calculation, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var calculations []Calculation
	result := db.Table("calculations").Where("deleted_at is NULL").Preload("CalculationItems").Preload("Wallet").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&calculations)

	return ToCalculationsListDomain(calculations), ToError(result.Error)
}

func (repo Repository) GetCalculationById(ctx context.Context, id int64) (domain.Calculation, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var calculation Calculation
	result := db.Table("calculations").Where("id = ?", id).Preload("CalculationItems").Preload("Wallet").First(&calculation)
	return ToCalculationDomain(calculation), ToError(result.Error)
}

func (repo Repository) CreateCalculation(ctx context.Context, calculation *domain.Calculation) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("calculations").Create(ToCalculationDB(*calculation))
	return ToError(result.Error)
}

func (repo Repository) UpdateCalculationById(ctx context.Context, calculation *domain.Calculation, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("calculations").Where("id = ?", id).Updates(ToCalculationDB(*calculation))
	return ToError(result.Error)
}

func (repo Repository) DeleteCalculationById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("calculations").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) CreateCalculationItems(ctx context.Context, calculationItems []domain.CalculationItem) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("calculation_items").Create(ToCalculationItemListDB(calculationItems))
	return ToError(result.Error)
}

func (repo Repository) DeleteCalculationItemById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("calculation_items").Where("id = ?", id).Delete(&CalculationItem{})
	return ToError(result.Error)
}

func (repo Repository) CompleteCalculationById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("calculations").Where("id = ?", id).Update("completed_at", currentTime)
	return ToError(result.Error)
}
