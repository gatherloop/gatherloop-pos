package domain

import (
	"context"
)

type CouponRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetCouponList(ctx context.Context) ([]Coupon, *Error)
	GetCouponById(ctx context.Context, id int64) (Coupon, *Error)
	CreateCoupon(ctx context.Context, coupon Coupon) (Coupon, *Error)
	UpdateCouponById(ctx context.Context, coupon Coupon, id int64) (Coupon, *Error)
	DeleteCouponById(ctx context.Context, id int64) *Error
}
