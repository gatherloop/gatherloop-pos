package rental

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetRentalList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, checkoutStatus CheckoutStatus) ([]Rental, *base.Error)
	GetRentalListTotal(ctx context.Context, query string, checkoutStatus CheckoutStatus) (int64, *base.Error)
	GetRentalById(ctx context.Context, id int64) (Rental, *base.Error)
	DeleteRentalById(ctx context.Context, id int64) *base.Error
	CheckinRentals(ctx context.Context, rentals []Rental) *base.Error
	CheckoutRental(ctx context.Context, rentalId int64) *base.Error
}
