package reservation

import (
	"apps/api/domain/variant"
	"time"
)

type Reservation struct {
	Id         int64
	Code       string
	Name       string
	VariantId  int64
	Variant    variant.Variant
	CheckinAt  time.Time
	CheckoutAt *time.Time
	CreatedAt  time.Time
	DeletedAt  *time.Time
}

type CheckoutStatus int

const (
	Completed CheckoutStatus = iota
	Ongoing
	All
)
