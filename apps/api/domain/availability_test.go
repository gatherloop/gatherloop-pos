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

func baseProduct() domain.Product {
	return domain.Product{
		Status:               domain.ProductStatusPublished,
		SaleType:             domain.SaleTypePurchase,
		IsAvailable:          true,
		AvailabilityTracking: domain.AvailabilityTrackingNone,
	}
}

func baseVariant() domain.Variant {
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
			product:           baseProduct(),
			variant:           func() domain.Variant { v := baseVariant(); v.IsAvailable = false; return v }(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "es kopi susu banana — tracking none, variant switched on",
			product:           baseProduct(),
			variant:           baseVariant(),
			expectedSellable:  true,
			expectedRemaining: nil,
		},
		{
			name: "soft cookies choco — tracking variant, quantity remaining",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variant:           func() domain.Variant { v := baseVariant(); v.AvailableQuantity = intPtr(6); return v }(),
			expectedSellable:  true,
			expectedRemaining: intPtr(6),
		},
		{
			name: "soft cookies red velvet — tracking variant, quantity exhausted",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variant:           func() domain.Variant { v := baseVariant(); v.AvailableQuantity = intPtr(0); return v }(),
			expectedSellable:  false,
			expectedRemaining: intPtr(0),
		},
		{
			name: "pancong choco — tracking product, quantity remaining",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variant:           baseVariant(),
			expectedSellable:  true,
			expectedRemaining: intPtr(5),
		},
		{
			name: "pancong — tracking product, dough exhausted",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(0)
				return p
			}(),
			variant:           baseVariant(),
			expectedSellable:  false,
			expectedRemaining: intPtr(0),
		},
		{
			name: "pancong matcha — dough remains but topping switched off",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variant:           func() domain.Variant { v := baseVariant(); v.IsAvailable = false; return v }(),
			expectedSellable:  false,
			expectedRemaining: intPtr(5),
		},
		{
			name:              "product soft-deleted",
			product:           func() domain.Product { p := baseProduct(); p.DeletedAt = &deletedAt; return p }(),
			variant:           baseVariant(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "variant soft-deleted",
			product:           baseProduct(),
			variant:           func() domain.Variant { v := baseVariant(); v.DeletedAt = &deletedAt; return v }(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "product is draft",
			product:           func() domain.Product { p := baseProduct(); p.Status = domain.ProductStatusDraft; return p }(),
			variant:           baseVariant(),
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name:              "product is rental",
			product:           func() domain.Product { p := baseProduct(); p.SaleType = domain.SaleTypeRental; return p }(),
			variant:           baseVariant(),
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

func TestResolveProductAvailability(t *testing.T) {
	tests := []struct {
		name              string
		product           domain.Product
		variants          []domain.Variant
		expectedSellable  bool
		expectedRemaining *int
	}{
		{
			name:    "es kopi susu — vanilla off, banana and hazelnut on",
			product: baseProduct(),
			variants: []domain.Variant{
				func() domain.Variant { v := baseVariant(); v.IsAvailable = false; return v }(),
				baseVariant(),
				baseVariant(),
			},
			expectedSellable:  true,
			expectedRemaining: nil,
		},
		{
			name: "soft cookies — choco remaining, red velvet exhausted",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variants: []domain.Variant{
				func() domain.Variant { v := baseVariant(); v.AvailableQuantity = intPtr(6); return v }(),
				func() domain.Variant { v := baseVariant(); v.AvailableQuantity = intPtr(0); return v }(),
			},
			expectedSellable:  true,
			expectedRemaining: nil,
		},
		{
			name: "soft cookies — both variants exhausted",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variants: []domain.Variant{
				func() domain.Variant { v := baseVariant(); v.AvailableQuantity = intPtr(0); return v }(),
				func() domain.Variant { v := baseVariant(); v.AvailableQuantity = intPtr(0); return v }(),
			},
			expectedSellable:  false,
			expectedRemaining: nil,
		},
		{
			name: "pancong — dough remaining, all variants on",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variants:          []domain.Variant{baseVariant(), baseVariant(), baseVariant()},
			expectedSellable:  true,
			expectedRemaining: intPtr(5),
		},
		{
			name: "pancong matcha off — choco and vanilla still sellable",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variants: []domain.Variant{
				baseVariant(),
				func() domain.Variant { v := baseVariant(); v.IsAvailable = false; return v }(),
				baseVariant(),
			},
			expectedSellable:  true,
			expectedRemaining: intPtr(5),
		},
		{
			name: "pancong — dough exhausted",
			product: func() domain.Product {
				p := baseProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(0)
				return p
			}(),
			variants:          []domain.Variant{baseVariant(), baseVariant(), baseVariant()},
			expectedSellable:  false,
			expectedRemaining: intPtr(0),
		},
		{
			name:              "product has no variants",
			product:           baseProduct(),
			variants:          []domain.Variant{},
			expectedSellable:  false,
			expectedRemaining: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isSellable, remaining := domain.ResolveProductAvailability(tt.product, tt.variants)
			assert.Equal(t, tt.expectedSellable, isSellable)
			assert.Equal(t, tt.expectedRemaining, remaining)
		})
	}
}
