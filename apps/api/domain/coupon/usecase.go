package coupon

import (
	"apps/api/domain/base"
	"context"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetCouponList(ctx context.Context) ([]Coupon, *base.Error) {
	return usecase.repository.GetCouponList(ctx)
}

func (usecase Usecase) GetCouponById(ctx context.Context, id int64) (Coupon, *base.Error) {
	return usecase.repository.GetCouponById(ctx, id)
}

func (usecase Usecase) CreateCoupon(ctx context.Context, coupon Coupon) *base.Error {
	return usecase.repository.CreateCoupon(ctx, &coupon)
}

func (usecase Usecase) UpdateCouponById(ctx context.Context, coupon Coupon, id int64) *base.Error {
	return usecase.repository.UpdateCouponById(ctx, &coupon, id)
}

func (usecase Usecase) DeleteCouponById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteCouponById(ctx, id)
}
