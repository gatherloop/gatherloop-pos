package coupon

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetCouponList(ctx context.Context) ([]Coupon, *base.Error)
	GetCouponById(ctx context.Context, id int64) (Coupon, *base.Error)
	CreateCoupon(ctx context.Context, coupon *Coupon) *base.Error
	UpdateCouponById(ctx context.Context, coupon *Coupon, id int64) *base.Error
	DeleteCouponById(ctx context.Context, id int64) *base.Error
}
