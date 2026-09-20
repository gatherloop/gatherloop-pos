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
