package domain

import "time"

type PricingTier struct {
	Id          int64
	VariantId   int64
	UpToMinutes int
	Price       float32
	CreatedAt   time.Time
}
