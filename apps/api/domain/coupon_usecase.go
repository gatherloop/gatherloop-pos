package domain

import (
	"context"
)

type CouponUsecase struct {
	repository CouponRepository
}

func NewCouponUsecase(repository CouponRepository) CouponUsecase {
	return CouponUsecase{repository: repository}
}

func (usecase CouponUsecase) GetCouponList(ctx context.Context) ([]Coupon, *Error) {
	return usecase.repository.GetCouponList(ctx)
}

func (usecase CouponUsecase) GetCouponById(ctx context.Context, id int64) (Coupon, *Error) {
	return usecase.repository.GetCouponById(ctx, id)
}

func (usecase CouponUsecase) CreateCoupon(ctx context.Context, coupon Coupon) (Coupon, *Error) {
	return usecase.repository.CreateCoupon(ctx, coupon)
}

func (usecase CouponUsecase) UpdateCouponById(ctx context.Context, coupon Coupon, id int64) (Coupon, *Error) {
	return usecase.repository.UpdateCouponById(ctx, coupon, id)
}

func (usecase CouponUsecase) DeleteCouponById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteCouponById(ctx, id)
}
