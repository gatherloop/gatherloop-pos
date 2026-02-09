package mysql

import "time"

type Rental struct {
	Id         int64
	Code       string
	Name       string
	VariantId  int64
	Variant    Variant
	CheckinAt  time.Time
	CheckoutAt *time.Time
	CreatedAt  time.Time
	DeletedAt  *time.Time
}
