package mysql

import "time"

type Coupon struct {
	Id        int64
	Code      string
	Type      string
	Amount    int64
	CreatedAt time.Time
	DeletedAt *time.Time
}
