//go:generate mockgen -source=pricing_tier_repository.go -destination=../data/mock/pricing_tier_repository.go -package=mock

package domain

import "context"

type PricingTierRepository interface {
	GetTiersByVariantId(ctx context.Context, variantId int64) ([]PricingTier, *Error)
	ReplaceTiersForVariant(ctx context.Context, variantId int64, tiers []PricingTier) *Error
}
