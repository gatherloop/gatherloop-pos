package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/reservation"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewReservationRepository(db *gorm.DB) reservation.Repository {
	return Repository{db: db}
}

func (repo Repository) GetReservationList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, checkoutStatus reservation.CheckoutStatus) ([]reservation.Reservation, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var transactionResults []reservation.Reservation
	result := db.Table("reservations").Where("deleted_at is NULL").Preload("Variant").Preload("Variant.VariantValues").Preload("Variant.VariantValues.OptionValue").Preload("Variant.Product").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

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
	case reservation.Completed:
		result = result.Where("checkout_at IS NOT NULL")
	case reservation.Ongoing:
		result = result.Where("checkout_at IS NULL")
	}

	result = result.Find(&transactionResults)

	return transactionResults, ToError(result.Error)
}

func (repo Repository) GetReservationListTotal(ctx context.Context, query string, checkoutStatus reservation.CheckoutStatus) (int64, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("reservations").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("code LIKE ?", "%"+query+"%")
	}

	switch checkoutStatus {
	case reservation.Completed:
		result = result.Where("checkout_at IS NOT NULL")
	case reservation.Ongoing:
		result = result.Where("checkout_at IS NULL")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetReservationById(ctx context.Context, id int64) (reservation.Reservation, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var reservation reservation.Reservation
	result := db.Table("reservations").Where("id = ?", id).Preload("Variant").Preload("Variant.Materials").Preload("Variant.Materials.Material").Preload("Variant.VariantValues").Preload("Variant.VariantValues.OptionValue").Preload("Variant.Product").First(&reservation)
	return reservation, ToError(result.Error)
}

func (repo Repository) CheckinReservations(ctx context.Context, reservations []reservation.Reservation) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("reservations").Create(reservations)
	return ToError(result.Error)
}

func (repo Repository) CheckoutReservation(ctx context.Context, reservationId int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("reservations").Where("id = ?", reservationId).Update("checkout_at", time.Now())
	return ToError(result.Error)
}

func (repo Repository) DeleteReservationById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("reservations").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
