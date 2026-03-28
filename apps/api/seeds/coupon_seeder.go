package seeds

import (
	"time"

	"gorm.io/gorm"
)

// CouponSeeder seeds sample discount coupons.
type CouponSeeder struct{}

func (CouponSeeder) Name() string { return "CouponSeeder" }

func (CouponSeeder) Seed(tx *gorm.DB) error {
	type Coupon struct {
		Id        int64
		Code      string
		Type      string
		Amount    int64
		CreatedAt time.Time
		DeletedAt *time.Time
	}

	coupons := []Coupon{
		{Code: "DISC10", Type: "percentage", Amount: 10, CreatedAt: time.Now()},
		{Code: "FLAT5K", Type: "fixed", Amount: 5000, CreatedAt: time.Now()},
	}

	for i := range coupons {
		var count int64
		if err := tx.Table("coupons").Where("code = ?", coupons[i].Code).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("coupons").Create(&coupons[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
