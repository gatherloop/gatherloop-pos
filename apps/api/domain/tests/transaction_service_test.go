package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestTransactionService_ApplyTransactionCoupons(t *testing.T) {
	tests := []struct {
		name             string
		base             float32
		coupon           domain.Coupon
		expectedDiscount float32
		expectError      bool
	}{
		{
			name:             "row1: FREE 1 HOUR on 30000 base",
			base:             30000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 15000},
			expectedDiscount: 15000,
		},
		{
			name:             "row2: FREE 1 HOUR on 45000 base",
			base:             45000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 15000},
			expectedDiscount: 15000,
		},
		{
			name:             "row3: FREE 2 HOUR on 45000 base",
			base:             45000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 30000},
			expectedDiscount: 30000,
		},
		{
			name:             "row4: FREE 2 HOUR on 15000 base, clamped to base",
			base:             15000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 30000},
			expectedDiscount: 15000,
		},
		{
			name:             "row5: STUDENT 40% on 30000 base",
			base:             30000,
			coupon:           domain.Coupon{Type: domain.Percentage, Amount: 40},
			expectedDiscount: 12000,
		},
		{
			name:             "row6: STUDENT 40% on 20000 base",
			base:             20000,
			coupon:           domain.Coupon{Type: domain.Percentage, Amount: 40},
			expectedDiscount: 8000,
		},
		{
			name:             "fixed exactly equal to base",
			base:             30000,
			coupon:           domain.Coupon{Type: domain.Fixed, Amount: 30000},
			expectedDiscount: 30000,
		},
		{
			name:             "percentage rounding boundary: 4900 rounds up to 5000",
			base:             12250,
			coupon:           domain.Coupon{Type: domain.Percentage, Amount: 40},
			expectedDiscount: 5000,
		},
		{
			name:        "unsupported coupon type returns BadRequest error",
			base:        30000,
			coupon:      domain.Coupon{Type: "unknown"},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			couponRepository := mock.NewMockCouponRepository(ctrl)
			couponRepository.EXPECT().GetCouponById(gomock.Any(), int64(1)).Return(tt.coupon, nil)

			service := domain.NewTransactionService(couponRepository, nil, nil, domain.PaymentService{})

			itemId := int64(10)
			transaction := domain.Transaction{
				Total: tt.base,
				TransactionItems: []domain.TransactionItem{
					{Id: itemId, Price: tt.base, Amount: 1, Subtotal: tt.base},
				},
				TransactionCoupons: []domain.TransactionCoupon{
					{CouponId: 1, TransactionItemId: &itemId},
				},
			}

			err := service.ApplyTransactionCoupons(context.Background(), &transaction, 99)

			if tt.expectError {
				assert.NotNil(t, err)
				assert.Equal(t, domain.BadRequest, err.Type)
				assert.Equal(t, float32(0), transaction.TransactionItems[0].DiscountAmount)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedDiscount, transaction.TransactionItems[0].DiscountAmount)
				assert.Equal(t, tt.base-tt.expectedDiscount, transaction.TransactionItems[0].Subtotal)
				assert.Equal(t, tt.base-tt.expectedDiscount, transaction.Total)
			}
		})
	}
}
