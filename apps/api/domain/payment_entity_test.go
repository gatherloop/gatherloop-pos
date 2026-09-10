package domain_test

import (
	"apps/api/domain"
	"regexp"
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

// partnerReferenceNoPattern is "ORD" plus 13 Crockford base32 characters
// (D18).
var partnerReferenceNoPattern = regexp.MustCompile(`^ORD[0-9A-HJKMNP-TV-Z]{13}$`)

func TestGeneratePartnerReferenceNo(t *testing.T) {
	seen := map[string]bool{}

	for i := 0; i < 100; i++ {
		code, err := domain.GeneratePartnerReferenceNo()

		assert.NoError(t, err)
		assert.Regexp(t, partnerReferenceNoPattern, code)
		assert.False(t, seen[code], "GeneratePartnerReferenceNo produced a duplicate: %q", code)
		seen[code] = true
	}
}

func TestValidateOrderPaymentWallet(t *testing.T) {
	deletedAt := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	testCases := []struct {
		name        string
		wallet      domain.Wallet
		expectError bool
	}{
		{
			name:        "a wallet that is a live payment target is valid",
			wallet:      domain.Wallet{Id: 1, Name: "QRIS", IsPaymentTarget: true},
			expectError: false,
		},
		{
			name:        "a soft-deleted wallet fails validation",
			wallet:      domain.Wallet{Id: 1, Name: "QRIS", IsPaymentTarget: true, DeletedAt: &deletedAt},
			expectError: true,
		},
		{
			name:        "a wallet that is not a payment target fails validation",
			wallet:      domain.Wallet{Id: 1, Name: "Cash", IsPaymentTarget: false},
			expectError: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := domain.ValidateOrderPaymentWallet(testCase.wallet)

			if testCase.expectError {
				assert.NotNil(t, err)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
