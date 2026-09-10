package doku

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newNotificationClient(t *testing.T) *Client {
	t.Helper()
	return &Client{
		config: Config{ClientSecret: "test-client-secret"},
		logger: testLogger(),
	}
}

func TestVerifyNotificationSignature_Valid(t *testing.T) {
	client := newNotificationClient(t)
	method := "POST"
	path := "/payments/doku/notification"
	body := []byte(`{"originalPartnerReferenceNo":"ORD1","originalReferenceNo":"REF1","latestTransactionStatus":"00","amount":{"value":"10000.00","currency":"IDR"}}`)
	timestamp := formatTimestamp(time.Now())

	signature, sigErr := signSymmetric(client.config.ClientSecret, method, path, "", body, timestamp)
	require.NoError(t, sigErr)

	err := client.VerifyNotificationSignature(method, path, domain.NotificationHeaders{
		Timestamp: timestamp,
		Signature: signature,
		PartnerId: "test-partner",
	}, body)

	assert.Nil(t, err)
}

func TestVerifyNotificationSignature_TamperedBody(t *testing.T) {
	client := newNotificationClient(t)
	method := "POST"
	path := "/payments/doku/notification"
	originalBody := []byte(`{"originalPartnerReferenceNo":"ORD1","amount":{"value":"10000.00","currency":"IDR"}}`)
	timestamp := formatTimestamp(time.Now())

	signature, sigErr := signSymmetric(client.config.ClientSecret, method, path, "", originalBody, timestamp)
	require.NoError(t, sigErr)

	tamperedBody := []byte(`{"originalPartnerReferenceNo":"ORD1","amount":{"value":"999999.00","currency":"IDR"}}`)

	err := client.VerifyNotificationSignature(method, path, domain.NotificationHeaders{
		Timestamp: timestamp,
		Signature: signature,
	}, tamperedBody)

	require.NotNil(t, err)
	assert.Equal(t, domain.Unauthorized, err.Type)
}

func TestVerifyNotificationSignature_TamperedSignature(t *testing.T) {
	client := newNotificationClient(t)
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)
	timestamp := formatTimestamp(time.Now())

	err := client.VerifyNotificationSignature("POST", "/payments/doku/notification", domain.NotificationHeaders{
		Timestamp: timestamp,
		Signature: "dGFtcGVyZWQtc2lnbmF0dXJl", // base64("tampered-signature")
	}, body)

	require.NotNil(t, err)
	assert.Equal(t, domain.Unauthorized, err.Type)
}

func TestVerifyNotificationSignature_MissingSignature(t *testing.T) {
	client := newNotificationClient(t)

	err := client.VerifyNotificationSignature("POST", "/payments/doku/notification", domain.NotificationHeaders{
		Timestamp: formatTimestamp(time.Now()),
	}, []byte(`{}`))

	require.NotNil(t, err)
	assert.Equal(t, domain.Unauthorized, err.Type)
}

func TestVerifyNotificationSignature_MissingTimestamp(t *testing.T) {
	client := newNotificationClient(t)
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)

	err := client.VerifyNotificationSignature("POST", "/payments/doku/notification", domain.NotificationHeaders{
		Signature: "anything",
	}, body)

	require.NotNil(t, err)
	assert.Equal(t, domain.Unauthorized, err.Type)
}

func TestVerifyNotificationSignature_MalformedTimestamp(t *testing.T) {
	client := newNotificationClient(t)
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)

	err := client.VerifyNotificationSignature("POST", "/payments/doku/notification", domain.NotificationHeaders{
		Timestamp: "not-a-timestamp",
		Signature: "anything",
	}, body)

	require.NotNil(t, err)
	assert.Equal(t, domain.Unauthorized, err.Type)
}

func TestVerifyNotificationSignature_ClockSkewRejected(t *testing.T) {
	client := newNotificationClient(t)
	method := "POST"
	path := "/payments/doku/notification"
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)
	staleTimestamp := formatTimestamp(time.Now().Add(-10 * time.Minute))

	signature, sigErr := signSymmetric(client.config.ClientSecret, method, path, "", body, staleTimestamp)
	require.NoError(t, sigErr)

	err := client.VerifyNotificationSignature(method, path, domain.NotificationHeaders{
		Timestamp: staleTimestamp,
		Signature: signature,
	}, body)

	require.NotNil(t, err)
	assert.Equal(t, domain.Unauthorized, err.Type)
}

func TestVerifyNotificationSignature_WithinSkewWindowAccepted(t *testing.T) {
	client := newNotificationClient(t)
	method := "POST"
	path := "/payments/doku/notification"
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)
	// Just inside the 5-minute window (D13).
	timestamp := formatTimestamp(time.Now().Add(-4*time.Minute - 30*time.Second))

	signature, sigErr := signSymmetric(client.config.ClientSecret, method, path, "", body, timestamp)
	require.NoError(t, sigErr)

	err := client.VerifyNotificationSignature(method, path, domain.NotificationHeaders{
		Timestamp: timestamp,
		Signature: signature,
	}, body)

	assert.Nil(t, err)
}

func TestParseNotification_Success(t *testing.T) {
	client := newNotificationClient(t)
	body := []byte(`{"originalPartnerReferenceNo":"ORD1","originalReferenceNo":"REF1","latestTransactionStatus":"00","transactionStatusDesc":"Success","amount":{"value":"25000.00","currency":"IDR"}}`)

	status, err := client.ParseNotification(body)

	require.Nil(t, err)
	assert.Equal(t, "ORD1", status.PartnerReferenceNo)
	assert.Equal(t, "REF1", status.GatewayReferenceNo)
	assert.Equal(t, domain.PaymentGatewayStatusPaid, status.Status)
	assert.Equal(t, float32(25000), status.PaidAmount)
}

func TestParseNotification_ExpiredAndFailedStatuses(t *testing.T) {
	tests := []struct {
		code     string
		expected domain.PaymentGatewayStatus
	}{
		{"05", domain.PaymentGatewayStatusExpired},
		{"06", domain.PaymentGatewayStatusFailed},
		{"99", domain.PaymentGatewayStatusPending},
	}

	client := newNotificationClient(t)
	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			body := []byte(`{"originalPartnerReferenceNo":"ORD1","latestTransactionStatus":"` + tt.code + `"}`)
			status, err := client.ParseNotification(body)
			require.Nil(t, err)
			assert.Equal(t, tt.expected, status.Status)
		})
	}
}

func TestParseNotification_MissingReferenceIsRejected(t *testing.T) {
	client := newNotificationClient(t)

	_, err := client.ParseNotification([]byte(`{"latestTransactionStatus":"00"}`))

	require.NotNil(t, err)
	assert.Equal(t, domain.BadRequest, err.Type)
}

func TestParseNotification_InvalidJSON(t *testing.T) {
	client := newNotificationClient(t)

	_, err := client.ParseNotification([]byte(`not json`))

	require.NotNil(t, err)
	assert.Equal(t, domain.BadRequest, err.Type)
}
