package domain

import (
	"context"
)

type RentalRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetRentalList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, checkoutStatus CheckoutStatus) ([]Rental, *Error)
	GetRentalListTotal(ctx context.Context, query string, checkoutStatus CheckoutStatus) (int64, *Error)
	GetRentalById(ctx context.Context, id int64) (Rental, *Error)
	DeleteRentalById(ctx context.Context, id int64) *Error
	CheckinRentals(ctx context.Context, rentals []Rental) ([]Rental, *Error)
	CheckoutRental(ctx context.Context, rentalId int64) *Error
}
