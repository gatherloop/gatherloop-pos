package domain

import (
	"context"
)

type CouponUsecase struct {
	couponRepoPort CouponRepoPort
}

func NewCouponUsecase(couponRepoPort CouponRepoPort) CouponUsecase {
	return CouponUsecase{couponRepoPort: couponRepoPort}
}

func (usecase CouponUsecase) GetCouponList(ctx context.Context) ([]Coupon, *Error) {
	return usecase.couponRepoPort.GetCouponList(ctx)
}

func (usecase CouponUsecase) GetCouponById(ctx context.Context, id int64) (Coupon, *Error) {
	return usecase.couponRepoPort.GetCouponById(ctx, id)
}

func (usecase CouponUsecase) CreateCoupon(ctx context.Context, coupon Coupon) (Coupon, *Error) {
	return usecase.couponRepoPort.CreateCoupon(ctx, coupon)
}

func (usecase CouponUsecase) UpdateCouponById(ctx context.Context, coupon Coupon, id int64) (Coupon, *Error) {
	return usecase.couponRepoPort.UpdateCouponById(ctx, coupon, id)
}

func (usecase CouponUsecase) DeleteCouponById(ctx context.Context, id int64) *Error {
	return usecase.couponRepoPort.DeleteCouponById(ctx, id)
}
