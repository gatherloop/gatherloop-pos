package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/coupon"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewCouponRepository(db *gorm.DB) coupon.Repository {
	return Repository{db: db}
}

func (repo Repository) GetCouponList(ctx context.Context) ([]coupon.Coupon, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var coupons []coupon.Coupon
	result := db.Table("coupons").Where("deleted_at", nil).Find(&coupons)
	return coupons, ToError(result.Error)
}

func (repo Repository) GetCouponById(ctx context.Context, id int64) (coupon.Coupon, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var coupon coupon.Coupon
	result := db.Table("coupons").Where("id = ?", id).First(&coupon)
	return coupon, ToError(result.Error)
}

func (repo Repository) CreateCoupon(ctx context.Context, coupon *coupon.Coupon) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("coupons").Create(coupon)
	return ToError(result.Error)
}

func (repo Repository) UpdateCouponById(ctx context.Context, coupon *coupon.Coupon, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("coupons").Where("id = ?", id).Updates(coupon)
	return ToError(result.Error)
}

func (repo Repository) DeleteCouponById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("coupons").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
