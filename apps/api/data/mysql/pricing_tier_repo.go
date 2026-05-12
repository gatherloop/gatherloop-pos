package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewPricingTierRepository(db *gorm.DB) domain.PricingTierRepository {
	return Repository{db: db}
}

func (repo Repository) GetTiersByVariantId(ctx context.Context, variantId int64) ([]domain.PricingTier, *domain.Error) {
	panic("pricing tier repository not yet implemented — complete Phase 3")
}

func (repo Repository) ReplaceTiersForVariant(ctx context.Context, variantId int64, tiers []domain.PricingTier) *domain.Error {
	panic("pricing tier repository not yet implemented — complete Phase 3")
}
