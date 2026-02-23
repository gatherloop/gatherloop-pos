package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewCouponRepository(db *gorm.DB) domain.CouponRepository {
	return Repository{db: db}
}

func (repo Repository) GetCouponList(ctx context.Context) ([]domain.Coupon, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var coupons []Coupon
	result := db.Table("coupons").Where("deleted_at", nil).Find(&coupons)
	return ToCouponListDomain(coupons), ToError(result.Error)
}

func (repo Repository) GetCouponById(ctx context.Context, id int64) (domain.Coupon, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var coupon Coupon
	result := db.Table("coupons").Where("id = ?", id).First(&coupon)
	return ToCouponDomain(coupon), ToError(result.Error)
}

func (repo Repository) CreateCoupon(ctx context.Context, coupon domain.Coupon) (domain.Coupon, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	couponPayload := ToCouponDB(coupon)
	result := db.Table("coupons").Create(&couponPayload)
	return ToCouponDomain(couponPayload), ToError(result.Error)
}

func (repo Repository) UpdateCouponById(ctx context.Context, coupon domain.Coupon, id int64) (domain.Coupon, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	couponPayload := ToCouponDB(coupon)
	if result := db.Table("coupons").Where("id = ?", id).Updates(&couponPayload); result.Error != nil {
		return domain.Coupon{}, ToError(result.Error)
	}

	var updatedCoupon Coupon
	fetchResult := db.Table("coupons").Where("id = ?", id).First(&updatedCoupon)
	return ToCouponDomain(updatedCoupon), ToError(fetchResult.Error)
}

func (repo Repository) DeleteCouponById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("coupons").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
