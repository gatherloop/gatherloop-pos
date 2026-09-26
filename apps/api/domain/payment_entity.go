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

type CancelQrisInput struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
}

type PaymentMethod string

const (
	PaymentMethodQris PaymentMethod = "qris"
	PaymentMethodCash PaymentMethod = "cash"
	PaymentMethodCod  PaymentMethod = "cod"
)

func ParsePaymentMethod(method string) (PaymentMethod, *Error) {
	switch PaymentMethod(method) {
	case "":
		return PaymentMethodQris, nil
	case PaymentMethodQris, PaymentMethodCash, PaymentMethodCod:
		return PaymentMethod(method), nil
	default:
		return "", &Error{Type: BadRequest, Message: "unknown payment method"}
	}
}

// PaymentVerificationStatus is the presence axis (D2): whether a barista has confirmed the guest
// is in the café, independent of payments.status (has the money been collected). It is nil for
// every method but cod.
type PaymentVerificationStatus string

const (
	PaymentVerificationStatusAwaiting PaymentVerificationStatus = "awaiting"
	PaymentVerificationStatusApproved PaymentVerificationStatus = "approved"
)

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
	PaymentCancelReasonRejected   PaymentCancelReason = "rejected"
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
	VerificationStatus     *PaymentVerificationStatus
	VerifiedAt             *time.Time
	StatusCheckedAt        *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
	DeletedAt              *time.Time
}

func (payment Payment) IsAwaitingPayment(now time.Time) bool {
	return payment.Status == PaymentStatePending && now.Before(payment.ExpiredAt)
}

// CanBeCancelledBy reports only the payment's own eligibility (pending, owned by sessionId, and
// not an approved COD order the bar has already started making); the feature flag is applied by
// the use case, not here (D10).
func (payment Payment) CanBeCancelledBy(sessionId string, now time.Time) bool {
	return payment.Status == PaymentStatePending && payment.SessionId == sessionId && !payment.isVerificationApproved()
}

func (payment Payment) RequiresGateway() bool {
	return payment.Method == PaymentMethodQris
}

// IsExpirable is FR-5's single predicate for whether the sweeper or a guest's own status poll may
// give up on this payment: an approved COD order is being made and must never expire, even past
// its own expired_at.
func (payment Payment) IsExpirable() bool {
	return payment.Status == PaymentStatePending && !payment.isVerificationApproved()
}

// IsAwaitingCodVerification is FR-5's guard for PayTransaction and CompleteTransaction: nothing
// should be paid for or marked ready before a barista has confirmed the guest is in the café.
func (payment Payment) IsAwaitingCodVerification() bool {
	return payment.VerificationStatus != nil && *payment.VerificationStatus == PaymentVerificationStatusAwaiting
}

func (payment Payment) isVerificationApproved() bool {
	return payment.VerificationStatus != nil && *payment.VerificationStatus == PaymentVerificationStatusApproved
}

type PaymentSummary struct {
	PartnerReferenceNo string
	Status             PaymentState
	Method             PaymentMethod
	VerificationStatus *PaymentVerificationStatus
	TransactionNumber  int64
	CustomerName       string
	TableLabel         string
	Amount             float32
	ItemCount          int
	CreatedAt          time.Time
	PaidAt             *time.Time
	CompletedAt        *time.Time
	DiningOption       DiningOption
}

func ToPaymentSummary(payment Payment, transaction TransactionSummary) PaymentSummary {
	return PaymentSummary{
		PartnerReferenceNo: payment.PartnerReferenceNo,
		Status:             payment.Status,
		Method:             payment.Method,
		VerificationStatus: payment.VerificationStatus,
		TransactionNumber:  transaction.TransactionNumber,
		CustomerName:       transaction.Name,
		TableLabel:         transaction.TableLabel,
		Amount:             payment.Amount,
		ItemCount:          transaction.ItemCount,
		CreatedAt:          payment.CreatedAt,
		PaidAt:             payment.PaidAt,
		CompletedAt:        transaction.CompletedAt,
		DiningOption:       transaction.DiningOption,
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
