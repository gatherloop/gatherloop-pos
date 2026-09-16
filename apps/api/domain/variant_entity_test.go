package domain_test

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func intPtr(v int) *int {
	return &v
}

func baseAvailableProduct() domain.Product {
	return domain.Product{
		Status:               domain.ProductStatusPublished,
		SaleType:             domain.SaleTypePurchase,
		IsAvailable:          true,
		AvailabilityTracking: domain.AvailabilityTrackingNone,
	}
}

func baseAvailableVariant() domain.Variant {
	return domain.Variant{
		IsAvailable: true,
	}
}

func TestResolveVariantAvailability(t *testing.T) {
	deletedAt := time.Now()

	tests := []struct {
		name              string
		product           domain.Product
		variant           domain.Variant
		expectedSellable  bool
		expectedRemaining *int
	}{
		{
			name:              "es kopi susu vanilla — tracking none, variant switched off",
			product:           baseAvailableProduct(),
			variant:           func() domain.Variant { v := baseAvailableVariant(); v.IsAvailable = false; return v }(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "es kopi susu banana — tracking none, variant switched on",
			product:           baseAvailableProduct(),
			variant:           baseAvailableVariant(),
			expectedSellable:  true,
			expectedRemaining: nil,
		},
		{
			name: "soft cookies choco — tracking variant, quantity remaining",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variant:           func() domain.Variant { v := baseAvailableVariant(); v.AvailableQuantity = intPtr(6); return v }(),
			expectedSellable:  true,
			expectedRemaining: intPtr(6),
		},
		{
			name: "soft cookies red velvet — tracking variant, quantity exhausted",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variant:           func() domain.Variant { v := baseAvailableVariant(); v.AvailableQuantity = intPtr(0); return v }(),
			expectedSellable:  false,
			expectedRemaining: intPtr(0),
		},
		{
			name: "pancong choco — tracking product, quantity remaining",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variant:           baseAvailableVariant(),
			expectedSellable:  true,
			expectedRemaining: intPtr(5),
		},
		{
			name: "pancong — tracking product, dough exhausted",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(0)
				return p
			}(),
			variant:           baseAvailableVariant(),
			expectedSellable:  false,
			expectedRemaining: intPtr(0),
		},
		{
			name: "pancong matcha — dough remains but topping switched off",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variant:           func() domain.Variant { v := baseAvailableVariant(); v.IsAvailable = false; return v }(),
			expectedSellable:  false,
			expectedRemaining: intPtr(5),
		},
		{
			name:              "product soft-deleted",
			product:           func() domain.Product { p := baseAvailableProduct(); p.DeletedAt = &deletedAt; return p }(),
			variant:           baseAvailableVariant(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "variant soft-deleted",
			product:           baseAvailableProduct(),
			variant:           func() domain.Variant { v := baseAvailableVariant(); v.DeletedAt = &deletedAt; return v }(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "product is draft",
			product:           func() domain.Product { p := baseAvailableProduct(); p.Status = domain.ProductStatusDraft; return p }(),
			variant:           baseAvailableVariant(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "product is rental",
			product:           func() domain.Product { p := baseAvailableProduct(); p.SaleType = domain.SaleTypeRental; return p }(),
			variant:           baseAvailableVariant(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isSellable, remaining := domain.ResolveVariantAvailability(tt.product, tt.variant)
			assert.Equal(t, tt.expectedSellable, isSellable)
			assert.Equal(t, tt.expectedRemaining, remaining)
		})
	}
}
