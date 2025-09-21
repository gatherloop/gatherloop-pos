package reservation

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetReservationList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, checkoutStatus CheckoutStatus) ([]Reservation, *base.Error)
	GetReservationListTotal(ctx context.Context, query string, checkoutStatus CheckoutStatus) (int64, *base.Error)
	GetReservationById(ctx context.Context, id int64) (Reservation, *base.Error)
	DeleteReservationById(ctx context.Context, id int64) *base.Error
	CheckinReservations(ctx context.Context, reservations []Reservation) *base.Error
	CheckoutReservation(ctx context.Context, reservationId int64) *base.Error
}
