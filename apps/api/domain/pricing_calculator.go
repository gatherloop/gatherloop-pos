package domain

import (
	"math"
	"time"
)

type PricingResult struct {
	Price float32
}

func CalculatePrice(tiers []PricingTier, duration time.Duration) (PricingResult, *Error) {
	if len(tiers) == 0 {
		return PricingResult{}, &Error{Type: BadRequest, Message: "snapshot has no tiers"}
	}
	durationMinutes := int(math.Ceil(duration.Minutes()))
	for _, tier := range tiers {
		if tier.UpToMinutes >= durationMinutes {
			return PricingResult{Price: tier.Price}, nil
		}
	}
	return PricingResult{Price: tiers[len(tiers)-1].Price}, nil
}
