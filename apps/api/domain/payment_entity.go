package domain

import (
	"crypto/rand"
	"encoding/base64"
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
	PaymentMethodCash PaymentMethod = "cash"
)

func ParsePaymentMethod(method string) (PaymentMethod, *Error) {
	switch PaymentMethod(method) {
	case "":
		return PaymentMethodQris, nil
	case PaymentMethodQris, PaymentMethodCash:
		return PaymentMethod(method), nil
	default:
		return "", &Error{Type: BadRequest, Message: "unknown payment method"}
	}
}

type PaymentState string

const (
	PaymentStatePending   PaymentState = "pending"
	PaymentStatePaid      PaymentState = "paid"
	PaymentStateExpired   PaymentState = "expired"
	PaymentStateFailed    PaymentState = "failed"
	PaymentStateCancelled PaymentState = "cancelled"
)

type PaymentCancelReason string

const (
	PaymentCancelReasonGuest      PaymentCancelReason = "guest"
	PaymentCancelReasonSuperseded PaymentCancelReason = "superseded"
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
	Id                     int64
	CartId                 int64
	SessionId              string
	CustomerWhatsappNumber *string
	TransactionId          *int64
	PartnerReferenceNo     string
	AccessKey              *string
	GatewayReferenceNo     string
	Method                 PaymentMethod
	Status                 PaymentState
	Amount                 float32
	QrContent              string
	ExpiredAt              time.Time
	PaidAt                 *time.Time
	CancelledAt            *time.Time
	CancelReason           *PaymentCancelReason
	StatusCheckedAt        *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
	DeletedAt              *time.Time
}

func (payment Payment) IsAwaitingPayment(now time.Time) bool {
	return payment.Status == PaymentStatePending && now.Before(payment.ExpiredAt)
}

// CanBeCancelledBy reports only the payment's own eligibility (pending, owned by sessionId);
// the feature flag is applied by the use case, not here (D10).
func (payment Payment) CanBeCancelledBy(sessionId string, now time.Time) bool {
	return payment.Status == PaymentStatePending && payment.SessionId == sessionId
}

func (payment Payment) RequiresGateway() bool {
	return payment.Method == PaymentMethodQris
}

type PaymentSummary struct {
	PartnerReferenceNo string
	Status             PaymentState
	Method             PaymentMethod
	TransactionNumber  int64
	CustomerName       string
	TableLabel         string
	Amount             float32
	ItemCount          int
	CreatedAt          time.Time
	PaidAt             *time.Time
	CompletedAt        *time.Time
}

func ToPaymentSummary(payment Payment, transaction TransactionSummary) PaymentSummary {
	return PaymentSummary{
		PartnerReferenceNo: payment.PartnerReferenceNo,
		Status:             payment.Status,
		Method:             payment.Method,
		TransactionNumber:  transaction.TransactionNumber,
		CustomerName:       transaction.Name,
		TableLabel:         transaction.TableLabel,
		Amount:             payment.Amount,
		ItemCount:          transaction.ItemCount,
		CreatedAt:          payment.CreatedAt,
		PaidAt:             payment.PaidAt,
		CompletedAt:        transaction.CompletedAt,
	}
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

const orderAccessKeyRandomBytes = 16

// GenerateOrderAccessKey is the per-payment credential carried in the WhatsApp link's ?k=
// query parameter (D4): it grants GetPaymentStatus read access to a payment's status page from
// any browser, not just the session that paid.
func GenerateOrderAccessKey() (string, error) {
	randomBytes := make([]byte, orderAccessKeyRandomBytes)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(randomBytes), nil
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
