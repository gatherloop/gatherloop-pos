package domain

import (
	"math"
	"time"
)

type Rental struct {
	Id           int64
	Code         string
	Name         string
	VariantId    int64
	Variant      Variant
	CheckinAt    time.Time
	CheckoutAt   *time.Time
	CreatedAt    time.Time
	DeletedAt    *time.Time
	PricingTiers []PricingTier
	TicketId     *int64
	TicketName   *string
}

func (rental Rental) Total() float32 {
	if len(rental.PricingTiers) == 0 {
		return 0
	}
	var duration time.Duration
	if rental.CheckoutAt != nil {
		duration = rental.CheckoutAt.Sub(rental.CheckinAt)
	} else {
		duration = time.Since(rental.CheckinAt)
	}
	durationMinutes := int64(math.Ceil(duration.Minutes()))
	for _, tier := range rental.PricingTiers {
		if tier.UpToMinutes >= durationMinutes {
			return tier.Price
		}
	}
	return rental.PricingTiers[len(rental.PricingTiers)-1].Price
}

type CheckoutStatus int

const (
	CheckoutStatusCompleted CheckoutStatus = iota
	CheckoutStatusOngoing
	CheckoutStatusAll
)
