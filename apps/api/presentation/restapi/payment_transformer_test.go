package restapi_test

import (
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetDokuNotification_Success(t *testing.T) {
	body := []byte(`{"originalPartnerReferenceNo":"ORD1","originalReferenceNo":"REF1","latestTransactionStatus":"00","transactionStatusDesc":"Success","amount":{"value":"25000.00","currency":"IDR"}}`)

	status, err := restapi.GetDokuNotification(body)

	require.NoError(t, err)
	assert.Equal(t, "ORD1", status.PartnerReferenceNo)
	assert.Equal(t, "REF1", status.GatewayReferenceNo)
	assert.Equal(t, domain.PaymentGatewayStatusPaid, status.Status)
	assert.Equal(t, float32(25000), status.PaidAmount)
}

func TestGetDokuNotification_ExpiredAndFailedStatuses(t *testing.T) {
	tests := []struct {
		code     string
		expected domain.PaymentGatewayStatus
	}{
		{"05", domain.PaymentGatewayStatusExpired},
		{"06", domain.PaymentGatewayStatusFailed},
		{"99", domain.PaymentGatewayStatusPending},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			body := []byte(`{"originalPartnerReferenceNo":"ORD1","originalReferenceNo":"REF1","latestTransactionStatus":"` + tt.code + `","transactionStatusDesc":"","amount":{"value":"25000.00","currency":"IDR"}}`)
			status, err := restapi.GetDokuNotification(body)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, status.Status)
		})
	}
}

func TestGetDokuNotification_InvalidJSON(t *testing.T) {
	_, err := restapi.GetDokuNotification([]byte(`not json`))

	assert.Error(t, err)
}
