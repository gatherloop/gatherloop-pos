package domain

import (
	"crypto/rand"
	"time"
)

type PaymentGatewayStatus string

const (
	PaymentGatewayStatusPending PaymentGatewayStatus = "pending"
	PaymentGatewayStatusPaid    PaymentGatewayStatus = "paid"
	PaymentGatewayStatusExpired PaymentGatewayStatus = "expired"
	PaymentGatewayStatusFailed  PaymentGatewayStatus = "failed"
)

type GenerateQrisInput struct {
	PartnerReferenceNo string
	Amount             float32
	ExpiredAt          time.Time
}

type QrisPayment struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
	QrContent          string
	ExpiredAt          time.Time
}

type QueryQrisInput struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
}

type QrisStatus struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
	Status             PaymentGatewayStatus
	PaidAmount         float32
	RawStatusCode      string
}

type PaymentMethod string

const (
	PaymentMethodQris PaymentMethod = "qris"
)

type PaymentState string

const (
	PaymentStatePending PaymentState = "pending"
	PaymentStatePaid    PaymentState = "paid"
	PaymentStateExpired PaymentState = "expired"
	PaymentStateFailed  PaymentState = "failed"
)

type ConfirmPaymentOutcome string

const (
	ConfirmPaymentOutcomePaid             ConfirmPaymentOutcome = "paid"
	ConfirmPaymentOutcomePaidLate         ConfirmPaymentOutcome = "paid_late"
	ConfirmPaymentOutcomeExpired          ConfirmPaymentOutcome = "expired"
	ConfirmPaymentOutcomeFailed           ConfirmPaymentOutcome = "failed"
	ConfirmPaymentOutcomeAlreadyPaid      ConfirmPaymentOutcome = "already_paid"
	ConfirmPaymentOutcomeUnknownReference ConfirmPaymentOutcome = "unknown_reference"
	ConfirmPaymentOutcomeAmountMismatch   ConfirmPaymentOutcome = "amount_mismatch"
	ConfirmPaymentOutcomeIgnored          ConfirmPaymentOutcome = "ignored"
)

type Payment struct {
	Id                 int64
	CartId             int64
	SessionId          string
	TransactionId      *int64
	PartnerReferenceNo string
	GatewayReferenceNo string
	Method             PaymentMethod
	Status             PaymentState
	Amount             float32
	QrContent          string
	ExpiredAt          time.Time
	PaidAt             *time.Time
	StatusCheckedAt    *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
	DeletedAt          *time.Time
}

func (payment Payment) IsAwaitingPayment(now time.Time) bool {
	return payment.Status == PaymentStatePending && now.Before(payment.ExpiredAt)
}

const partnerReferenceNoRandomLength = 13

func GeneratePartnerReferenceNo() (string, error) {
	randomBytes := make([]byte, partnerReferenceNoRandomLength)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	code := make([]byte, partnerReferenceNoRandomLength)
	for i, b := range randomBytes {
		code[i] = tableCodeAlphabet[int(b)%len(tableCodeAlphabet)]
	}

	return "ORD" + string(code), nil
}

func ValidateOrderPaymentWallet(wallet Wallet) *Error {
	if wallet.DeletedAt != nil {
		return &Error{Type: InternalServerError, Message: "ORDER_PAYMENT_WALLET_ID points at a deleted wallet"}
	}
	if !wallet.IsPaymentTarget {
		return &Error{Type: InternalServerError, Message: "ORDER_PAYMENT_WALLET_ID points at a wallet that is not a payment target"}
	}
	return nil
}
