package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"testing"

	"github.com/stretchr/testify/require"
)

// D16: paymentMethod is nil for a POS transaction (no linked payment row) and
// carries the linked payment's method for an order transaction.
func TestToTransactionDomain_PaymentMethod(t *testing.T) {
	cash := "cash"
	qris := "qris"

	tests := []struct {
		name            string
		dbPaymentMethod *string
		expected        *domain.PaymentMethod
	}{
		{
			name:            "a POS transaction has no linked payment",
			dbPaymentMethod: nil,
			expected:        nil,
		},
		{
			name:            "a cash order transaction reports cash",
			dbPaymentMethod: &cash,
			expected:        methodPtr(domain.PaymentMethodCash),
		},
		{
			name:            "a QRIS order transaction reports qris",
			dbPaymentMethod: &qris,
			expected:        methodPtr(domain.PaymentMethodQris),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			domainTransaction := mysql.ToTransactionDomain(mysql.Transaction{PaymentMethod: tt.dbPaymentMethod})

			if tt.expected == nil {
				require.Nil(t, domainTransaction.PaymentMethod)
			} else {
				require.NotNil(t, domainTransaction.PaymentMethod)
				require.Equal(t, *tt.expected, *domainTransaction.PaymentMethod)
			}
		})
	}
}

func methodPtr(method domain.PaymentMethod) *domain.PaymentMethod {
	return &method
}

// paymentVerificationStatus is joined next to payment_method (D2): nil for POS and non-COD
// order transactions, and the COD payment's presence-axis status for a COD one.
func TestToTransactionDomain_PaymentVerificationStatus(t *testing.T) {
	awaiting := "awaiting"
	approved := "approved"

	tests := []struct {
		name                        string
		dbPaymentVerificationStatus *string
		expected                    *domain.PaymentVerificationStatus
	}{
		{
			name:                        "a POS or non-COD transaction has no verification status",
			dbPaymentVerificationStatus: nil,
			expected:                    nil,
		},
		{
			name:                        "an unverified COD order reports awaiting",
			dbPaymentVerificationStatus: &awaiting,
			expected:                    verificationStatusPtr(domain.PaymentVerificationStatusAwaiting),
		},
		{
			name:                        "a verified COD order reports approved",
			dbPaymentVerificationStatus: &approved,
			expected:                    verificationStatusPtr(domain.PaymentVerificationStatusApproved),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			domainTransaction := mysql.ToTransactionDomain(mysql.Transaction{PaymentVerificationStatus: tt.dbPaymentVerificationStatus})

			if tt.expected == nil {
				require.Nil(t, domainTransaction.PaymentVerificationStatus)
			} else {
				require.NotNil(t, domainTransaction.PaymentVerificationStatus)
				require.Equal(t, *tt.expected, *domainTransaction.PaymentVerificationStatus)
			}
		})
	}
}

func verificationStatusPtr(status domain.PaymentVerificationStatus) *domain.PaymentVerificationStatus {
	return &status
}
