package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
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

func (repo Repository) CreateCalculation(ctx context.Context, calculation domain.Calculation) (domain.Calculation, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToCalculationDB(calculation)
	result := db.Table("calculations").Create(&payload)
	if result.Error != nil {
		return domain.Calculation{}, ToError(result.Error)
	}

	var created Calculation
	fetchResult := db.Table("calculations").Where("id = ?", payload.Id).Preload("CalculationItems").Preload("Wallet").First(&created)
	return ToCalculationDomain(created), ToError(fetchResult.Error)
}

func (repo Repository) UpdateCalculationById(ctx context.Context, calculation domain.Calculation, id int64) (domain.Calculation, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	calculation.Id = id // Ensure the ID is set for the update operation

	// Perform update with full save associations to insert/update items automatically
	calculationPayload := ToCalculationDB(calculation)
	result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("calculations").Where("id = ?", id).Updates(&calculationPayload)
	if result.Error != nil {
		return domain.Calculation{}, ToError(result.Error)
	}

	// Determine which existing item IDs to keep (those that are present in the incoming payload)
	idsToKeep := []int64{}
	for _, it := range calculationPayload.CalculationItems {
		if it.Id > 0 {
			idsToKeep = append(idsToKeep, it.Id)
		}
	}

	if len(idsToKeep) > 0 {
		// delete items that were present before but are not in the incoming idsToKeep
		if err := db.Table("calculation_items").Where("calculation_id = ? AND id NOT IN ?", id, idsToKeep).Delete(&CalculationItem{}).Error; err != nil {
			return domain.Calculation{}, ToError(err)
		}
	} else {
		// If incoming payload has no existing IDs, remove all previously existing items
		if err := db.Table("calculation_items").Where("calculation_id = ?", id).Delete(&CalculationItem{}).Error; err != nil {
			return domain.Calculation{}, ToError(err)
		}
	}

	// fetch updated record to return complete domain object with all associations
	var updated Calculation
	fetchResult := db.Table("calculations").Where("id = ?", id).Preload("CalculationItems").Preload("Wallet").First(&updated)
	return ToCalculationDomain(updated), ToError(fetchResult.Error)
}

func (repo Repository) DeleteCalculationById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("calculations").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) CompleteCalculationById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("calculations").Where("id = ?", id).Update("completed_at", currentTime)
	return ToError(result.Error)
}
