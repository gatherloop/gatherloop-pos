package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveProductAvailability(t *testing.T) {
	tests := []struct {
		name                     string
		product                  domain.Product
		variants                 []domain.Variant
		expectedSellable         bool
		expectedSellableQuantity *int
	}{
		{
			name:    "es kopi susu — vanilla off, banana and hazelnut on",
			product: baseAvailableProduct(),
			variants: []domain.Variant{
				func() domain.Variant { v := baseAvailableVariant(); v.IsAvailable = false; return v }(),
				baseAvailableVariant(),
				baseAvailableVariant(),
			},
			expectedSellable:         true,
			expectedSellableQuantity: nil,
		},
		{
			name: "soft cookies — choco remaining, red velvet exhausted",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variants: []domain.Variant{
				func() domain.Variant { v := baseAvailableVariant(); v.AvailableQuantity = intPtr(6); return v }(),
				func() domain.Variant { v := baseAvailableVariant(); v.AvailableQuantity = intPtr(0); return v }(),
			},
			expectedSellable:         true,
			expectedSellableQuantity: nil,
		},
		{
			name: "soft cookies — both variants exhausted",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingVariant
				return p
			}(),
			variants: []domain.Variant{
				func() domain.Variant { v := baseAvailableVariant(); v.AvailableQuantity = intPtr(0); return v }(),
				func() domain.Variant { v := baseAvailableVariant(); v.AvailableQuantity = intPtr(0); return v }(),
			},
			expectedSellable:         false,
			expectedSellableQuantity: nil,
		},
		{
			name: "pancong — dough remaining, all variants on",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variants:                 []domain.Variant{baseAvailableVariant(), baseAvailableVariant(), baseAvailableVariant()},
			expectedSellable:         true,
			expectedSellableQuantity: intPtr(5),
		},
		{
			name: "pancong matcha off — choco and vanilla still sellable",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(5)
				return p
			}(),
			variants: []domain.Variant{
				baseAvailableVariant(),
				func() domain.Variant { v := baseAvailableVariant(); v.IsAvailable = false; return v }(),
				baseAvailableVariant(),
			},
			expectedSellable:         true,
			expectedSellableQuantity: intPtr(5),
		},
		{
			name: "pancong — dough exhausted",
			product: func() domain.Product {
				p := baseAvailableProduct()
				p.AvailabilityTracking = domain.AvailabilityTrackingProduct
				p.AvailableQuantity = intPtr(0)
				return p
			}(),
			variants:                 []domain.Variant{baseAvailableVariant(), baseAvailableVariant(), baseAvailableVariant()},
			expectedSellable:         false,
			expectedSellableQuantity: intPtr(0),
		},
		{
			name:                     "product has no variants",
			product:                  baseAvailableProduct(),
			variants:                 []domain.Variant{},
			expectedSellable:         false,
			expectedSellableQuantity: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isSellable, sellableQuantity := domain.ResolveProductAvailability(tt.product, tt.variants)
			assert.Equal(t, tt.expectedSellable, isSellable)
			assert.Equal(t, tt.expectedSellableQuantity, sellableQuantity)
		})
	}
}
