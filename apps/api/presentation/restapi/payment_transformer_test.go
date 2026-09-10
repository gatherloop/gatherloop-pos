package restapi_test

import (
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetDokuNotificationRequest_Success(t *testing.T) {
	body := []byte(`{"originalPartnerReferenceNo":"ORD1","originalReferenceNo":"REF1","latestTransactionStatus":"00","transactionStatusDesc":"Success","amount":{"value":"25000.00","currency":"IDR"}}`)

	request, err := restapi.GetDokuNotificationRequest(body)

	require.NoError(t, err)
	assert.Equal(t, "ORD1", request.OriginalPartnerReferenceNo)
	assert.Equal(t, "REF1", request.OriginalReferenceNo)
	assert.Equal(t, "00", request.LatestTransactionStatus)
	assert.Equal(t, "25000.00", request.Amount.Value)
}

func TestGetDokuNotificationRequest_InvalidJSON(t *testing.T) {
	_, err := restapi.GetDokuNotificationRequest([]byte(`not json`))

	assert.Error(t, err)
}

func TestToQrisStatus_Success(t *testing.T) {
	body := []byte(`{"originalPartnerReferenceNo":"ORD1","originalReferenceNo":"REF1","latestTransactionStatus":"00","transactionStatusDesc":"Success","amount":{"value":"25000.00","currency":"IDR"}}`)
	request, err := restapi.GetDokuNotificationRequest(body)
	require.NoError(t, err)

	status := restapi.ToQrisStatus(request)

	assert.Equal(t, "ORD1", status.PartnerReferenceNo)
	assert.Equal(t, "REF1", status.GatewayReferenceNo)
	assert.Equal(t, domain.PaymentGatewayStatusPaid, status.Status)
	assert.Equal(t, float32(25000), status.PaidAmount)
}

func TestToQrisStatus_ExpiredAndFailedStatuses(t *testing.T) {
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
			request, err := restapi.GetDokuNotificationRequest(body)
			require.NoError(t, err)

			status := restapi.ToQrisStatus(request)

			assert.Equal(t, tt.expected, status.Status)
		})
	}
}
