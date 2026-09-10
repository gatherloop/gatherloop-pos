package domain_test

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestPaymentIsAwaitingPayment(t *testing.T) {
	expiredAt := time.Date(2026, 9, 10, 12, 5, 0, 0, time.UTC)

	testCases := []struct {
		name     string
		status   domain.PaymentState
		now      time.Time
		expected bool
	}{
		{
			name:     "pending and inside the window",
			status:   domain.PaymentStatePending,
			now:      expiredAt.Add(-1 * time.Second),
			expected: true,
		},
		{
			// Exclusive: at exactly expired_at the window is over, so a
			// cart frozen by this payment is released rather than held for
			// one more instant.
			name:     "pending at exactly the expiry instant",
			status:   domain.PaymentStatePending,
			now:      expiredAt,
			expected: false,
		},
		{
			name:     "pending but past the window",
			status:   domain.PaymentStatePending,
			now:      expiredAt.Add(1 * time.Second),
			expected: false,
		},
		{
			// A paid payment converts the cart; it never freezes it, and a
			// second checkout must not reuse its QR.
			name:     "paid inside the window",
			status:   domain.PaymentStatePaid,
			now:      expiredAt.Add(-1 * time.Second),
			expected: false,
		},
		{
			name:     "expired inside the window",
			status:   domain.PaymentStateExpired,
			now:      expiredAt.Add(-1 * time.Second),
			expected: false,
		},
		{
			name:     "failed inside the window",
			status:   domain.PaymentStateFailed,
			now:      expiredAt.Add(-1 * time.Second),
			expected: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			payment := domain.Payment{
				Status:    testCase.status,
				ExpiredAt: expiredAt,
			}

			assert.Equal(t, testCase.expected, payment.IsAwaitingPayment(testCase.now))
		})
	}
}
