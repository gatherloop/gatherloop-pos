package domain

import "time"

type CouponType string

const (
	Fixed      CouponType = "fixed"
	Percentage CouponType = "percentage"
)

type Coupon struct {
	Id        int64
	Code      string
	Type      CouponType
	Amount    int64
	CreatedAt time.Time
	DeletedAt *time.Time
}
