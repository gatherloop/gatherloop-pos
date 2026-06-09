package domain_test

import (
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestApplyCouponToBase(t *testing.T) {
	tests := []struct {
		name             string
		base             float32
		coupon           domain.Coupon
		expectedDiscount float32
		expectError      bool
	}{
		// FR-4 row 1: FREE 1 HOUR (fixed 15000), base 30000 → discount 15000, subtotal 15000
		{
			name:             "row1: FREE 1 HOUR on 30000 base",
			base:             30000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 15000},
			expectedDiscount: 15000,
		},
		// FR-4 row 2: FREE 1 HOUR (fixed 15000), base 45000 → discount 15000, subtotal 30000
		{
			name:             "row2: FREE 1 HOUR on 45000 base",
			base:             45000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 15000},
			expectedDiscount: 15000,
		},
		// FR-4 row 3: FREE 2 HOUR (fixed 30000), base 45000 → discount 30000, subtotal 15000
		{
			name:             "row3: FREE 2 HOUR on 45000 base",
			base:             45000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 30000},
			expectedDiscount: 30000,
		},
		// FR-4 row 4: FREE 2 HOUR (fixed 30000), base 15000 → clamped to 15000 (D3), subtotal 0
		{
			name:             "row4: FREE 2 HOUR on 15000 base, clamped to base",
			base:             15000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 30000},
			expectedDiscount: 15000,
		},
		// FR-4 row 5: STUDENT (percentage 40), base 30000 → 30000*40/100 = 12000, subtotal 18000
		{
			name:             "row5: STUDENT 40% on 30000 base",
			base:             30000,
			coupon:           domain.Coupon{Type: domain.Percentage, Amount: 40},
			expectedDiscount: 12000,
		},
		// FR-4 row 6: STUDENT (percentage 40), base 20000 → 20000*40/100 = 8000, subtotal 12000
		{
			name:             "row6: STUDENT 40% on 20000 base",
			base:             20000,
			coupon:           domain.Coupon{Type: domain.Percentage, Amount: 40},
			expectedDiscount: 8000,
		},
		// FR-4 row 7: (none) — no coupon applied; ApplyCouponToBase is not called in this path,
		// the item subtotal equals base unchanged. Verified at the usecase level, not here.

		// fixed exactly equal to base → discount = base, subtotal 0
		{
			name:             "fixed exactly equal to base",
			base:             30000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 30000},
			expectedDiscount: 30000,
		},
		// percentage rounding boundary: 12250*40/100 = 4900, rounds up to nearest 500 → 5000
		{
			name:             "percentage rounding boundary: 4900 rounds up to 5000",
			base:             12250,
			coupon:           domain.Coupon{Type: domain.Percentage, Amount: 40},
			expectedDiscount: 5000,
		},
		// unsupported coupon type → error
		{
			name:        "unsupported coupon type returns BadRequest error",
			base:        30000,
			coupon:      domain.Coupon{Type: "unknown"},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			discount, err := domain.ApplyCouponToBase(tt.base, tt.coupon)

			if tt.expectError {
				assert.NotNil(t, err)
				assert.Equal(t, domain.BadRequest, err.Type)
				assert.Equal(t, float32(0), discount)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedDiscount, discount)
			}
		})
	}
}
