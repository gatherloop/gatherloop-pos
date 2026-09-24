package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestPaymentTransformerRoundTrip(t *testing.T) {
	transactionId := int64(42)
	whatsappNumber := "6281234567890"
	paidAt := time.Date(2026, 9, 10, 12, 3, 0, 0, time.UTC)
	cancelledAt := time.Date(2026, 9, 10, 12, 4, 0, 0, time.UTC)
	cancelReason := domain.PaymentCancelReasonGuest
	statusCheckedAt := time.Date(2026, 9, 10, 12, 2, 55, 0, time.UTC)

	payment := domain.Payment{
		Id:                     7,
		CartId:                 11,
		SessionId:              "0d5a116f-f751-4f2e-8bd2-a406cc9be069",
		CustomerWhatsappNumber: &whatsappNumber,
		TransactionId:          &transactionId,
		PartnerReferenceNo:     "ORD0123456789ABC",
		GatewayReferenceNo:     "DOKU-REF-1",
		Method:                 domain.PaymentMethodQris,
		Status:                 domain.PaymentStatePaid,
		Amount:                 25000,
		QrContent:              "00020101021226",
		ExpiredAt:              time.Date(2026, 9, 10, 12, 5, 0, 0, time.UTC),
		PaidAt:                 &paidAt,
		CancelledAt:            &cancelledAt,
		CancelReason:           &cancelReason,
		StatusCheckedAt:        &statusCheckedAt,
		CreatedAt:              time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC),
		UpdatedAt:              time.Date(2026, 9, 10, 12, 3, 0, 0, time.UTC),
	}

	assert.Equal(t, payment, mysql.ToPaymentDomain(mysql.ToPaymentDB(payment)))
}

func TestPaymentTransformerMapsEmptyQrContentToNull(t *testing.T) {
	db := mysql.ToPaymentDB(domain.Payment{QrContent: ""})

	assert.Nil(t, db.QrContent)
	assert.Equal(t, "", mysql.ToPaymentDomain(db).QrContent)
}

func TestPaymentTransformerMapsNilCancelReasonToNull(t *testing.T) {
	db := mysql.ToPaymentDB(domain.Payment{CancelReason: nil})

	assert.Nil(t, db.CancelReason)
	assert.Nil(t, mysql.ToPaymentDomain(db).CancelReason)
}
