package restapi_test

import (
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"testing"
	"time"

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

func TestToApiPayment_PreparingWhenNotCompleted(t *testing.T) {
	payment := domain.Payment{PartnerReferenceNo: "ORD1", Status: domain.PaymentStatePaid}
	transaction := domain.Transaction{TransactionNumber: 12, CompletedAt: nil}

	apiPayment := restapi.ToApiPayment(payment, transaction, false)

	assert.Equal(t, int64(12), apiPayment.TransactionNumber)
	assert.Equal(t, "preparing", apiPayment.FulfillmentStatus)
}

func TestToApiPayment_ReadyWhenCompleted(t *testing.T) {
	completedAt := time.Now()
	payment := domain.Payment{PartnerReferenceNo: "ORD1", Status: domain.PaymentStatePaid}
	transaction := domain.Transaction{TransactionNumber: 12, CompletedAt: &completedAt}

	apiPayment := restapi.ToApiPayment(payment, transaction, false)

	assert.Equal(t, int64(12), apiPayment.TransactionNumber)
	assert.Equal(t, "ready", apiPayment.FulfillmentStatus)
}

func TestToApiPayment_CanCancelIsCarriedAsGiven(t *testing.T) {
	payment := domain.Payment{PartnerReferenceNo: "ORD1", Status: domain.PaymentStatePending}
	transaction := domain.Transaction{TransactionNumber: 12}

	assert.True(t, restapi.ToApiPayment(payment, transaction, true).CanCancel)
	assert.False(t, restapi.ToApiPayment(payment, transaction, false).CanCancel)
}

func TestToApiPayment_CancelReason(t *testing.T) {
	transaction := domain.Transaction{TransactionNumber: 12}

	t.Run("nil when the payment was never cancelled", func(t *testing.T) {
		payment := domain.Payment{PartnerReferenceNo: "ORD1", Status: domain.PaymentStatePending}

		apiPayment := restapi.ToApiPayment(payment, transaction, false)

		assert.Nil(t, apiPayment.CancelReason)
	})

	t.Run("carries the reason when cancelled", func(t *testing.T) {
		reason := domain.PaymentCancelReasonGuest
		payment := domain.Payment{PartnerReferenceNo: "ORD1", Status: domain.PaymentStateCancelled, CancelReason: &reason}

		apiPayment := restapi.ToApiPayment(payment, transaction, false)

		require.NotNil(t, apiPayment.CancelReason)
		assert.Equal(t, "guest", *apiPayment.CancelReason)
	})
}

func TestToApiPaymentSummary_AgreesWithToApiPaymentOnFulfillmentStatus(t *testing.T) {
	tests := []struct {
		name        string
		completedAt *time.Time
	}{
		{name: "not completed", completedAt: nil},
		{name: "completed", completedAt: func() *time.Time { now := time.Now(); return &now }()},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payment := domain.Payment{PartnerReferenceNo: "ORD1", Status: domain.PaymentStatePaid, Amount: 30000}
			transaction := domain.Transaction{TransactionNumber: 12, Name: "Budi", CompletedAt: tt.completedAt}
			summary := domain.ToPaymentSummary(payment, domain.TransactionSummary{
				TransactionNumber: transaction.TransactionNumber,
				Name:              transaction.Name,
				CompletedAt:       transaction.CompletedAt,
			})

			apiPayment := restapi.ToApiPayment(payment, transaction, false)
			apiPaymentSummary := restapi.ToApiPaymentSummary(summary)

			assert.Equal(t, apiPayment.FulfillmentStatus, apiPaymentSummary.FulfillmentStatus)
		})
	}
}

func TestToApiPaymentSummary_MapsFields(t *testing.T) {
	createdAt := time.Now().Add(-time.Hour)
	paidAt := time.Now()
	summary := domain.PaymentSummary{
		PartnerReferenceNo: "ORD1",
		Status:             domain.PaymentStatePaid,
		TransactionNumber:  12,
		CustomerName:       "Budi",
		TableLabel:         "Meja 3",
		Amount:             45000,
		ItemCount:          3,
		CreatedAt:          createdAt,
		PaidAt:             &paidAt,
	}

	apiPaymentSummary := restapi.ToApiPaymentSummary(summary)

	assert.Equal(t, "ORD1", apiPaymentSummary.PartnerReferenceNo)
	assert.Equal(t, "paid", apiPaymentSummary.Status)
	assert.Equal(t, int64(12), apiPaymentSummary.TransactionNumber)
	assert.Equal(t, "Budi", apiPaymentSummary.CustomerName)
	assert.Equal(t, "Meja 3", apiPaymentSummary.TableLabel)
	assert.Equal(t, float32(45000), apiPaymentSummary.Amount)
	assert.Equal(t, int64(3), apiPaymentSummary.ItemCount)
	assert.Equal(t, createdAt, apiPaymentSummary.CreatedAt)
	require.NotNil(t, apiPaymentSummary.PaidAt)
	assert.Equal(t, paidAt, *apiPaymentSummary.PaidAt)
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
