package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewRentalRepository(db *gorm.DB) domain.RentalRepository {
	return Repository{db: db}
}

func (repo Repository) GetRentalList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int, checkoutStatus domain.CheckoutStatus) ([]domain.Rental, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var transactionResults []domain.Rental
	result := db.Table("rentals").Where("deleted_at is NULL").Preload("Variant").Preload("Variant.VariantValues").Preload("Variant.VariantValues.OptionValue").Preload("Variant.Product").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if query != "" {
		result = result.Where("code LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	switch checkoutStatus {
	case domain.CheckoutStatusCompleted:
		result = result.Where("checkout_at IS NOT NULL")
	case domain.CheckoutStatusOngoing:
		result = result.Where("checkout_at IS NULL")
	}

	result = result.Find(&transactionResults)

	return transactionResults, ToError(result.Error)
}

func (repo Repository) GetRentalListTotal(ctx context.Context, query string, checkoutStatus domain.CheckoutStatus) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("rentals").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("code LIKE ?", "%"+query+"%")
	}

	switch checkoutStatus {
	case domain.CheckoutStatusCompleted:
		result = result.Where("checkout_at IS NOT NULL")
	case domain.CheckoutStatusOngoing:
		result = result.Where("checkout_at IS NULL")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetRentalById(ctx context.Context, id int64) (domain.Rental, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var rental domain.Rental
	result := db.Table("rentals").Where("id = ?", id).Preload("Variant").Preload("Variant.Materials").Preload("Variant.Materials.Material").Preload("Variant.VariantValues").Preload("Variant.VariantValues.OptionValue").Preload("Variant.Product").First(&rental)
	return rental, ToError(result.Error)
}

func (repo Repository) CheckinRentals(ctx context.Context, rentals []domain.Rental) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("rentals").Create(rentals)
	return ToError(result.Error)
}

func (repo Repository) CheckoutRental(ctx context.Context, rentalId int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("rentals").Where("id = ?", rentalId).Update("checkout_at", time.Now())
	return ToError(result.Error)
}

func (repo Repository) DeleteRentalById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("rentals").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
