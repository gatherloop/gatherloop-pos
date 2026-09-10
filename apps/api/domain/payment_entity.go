package domain

import (
	"crypto/rand"
	"time"
)

// PaymentGatewayStatus is the state DOKU reports for a QRIS payment,
// normalised away from DOKU's own status/response codes (FR-3).
type PaymentGatewayStatus string

const (
	PaymentGatewayStatusPending PaymentGatewayStatus = "pending"
	PaymentGatewayStatusPaid    PaymentGatewayStatus = "paid"
	PaymentGatewayStatusExpired PaymentGatewayStatus = "expired"
	PaymentGatewayStatusFailed  PaymentGatewayStatus = "failed"
)

// GenerateQrisInput is what PaymentGatewayRepository.GenerateQris needs to
// mint a dynamic QRIS QR. The amount and expiry are always computed by the
// caller (D9) — nothing here is ever taken from the client.
type GenerateQrisInput struct {
	PartnerReferenceNo string
	Amount             float32
	ExpiredAt          time.Time
}

// QrisPayment is DOKU's qr-mpm-generate response, mapped out of its SNAP
// envelope.
type QrisPayment struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
	QrContent          string
	ExpiredAt          time.Time
}

// QueryQrisInput is what PaymentGatewayRepository.QueryQris needs to ask
// DOKU for a payment's current status.
type QueryQrisInput struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
}

// QrisStatus is DOKU's qr-mpm-query response, and also what an inbound
// payment notification parses to (FR-6) — the notification and the query
// answer the same question, so they share one shape and one status
// transition.
type QrisStatus struct {
	PartnerReferenceNo string
	GatewayReferenceNo string
	Status             PaymentGatewayStatus
	PaidAmount         float32
	RawStatusCode      string
}

// PaymentMethod is how a gateway payment is collected. Only qris is ever
// written today — the column exists so a second method is a value rather than
// a migration (FR-5).
type PaymentMethod string

const (
	PaymentMethodQris PaymentMethod = "qris"
)

// PaymentState is the lifecycle of a `payments` row. Transitions are one-way:
// pending → paid | expired | failed, plus the single expired → paid path a
// late notification takes when DOKU collected money after our own timer had
// already given up (D5, D14).
//
// It is named PaymentState rather than PaymentStatus only because
// domain.PaymentStatus is already taken — by the paid/unpaid/all filter the
// POS transaction list uses (transaction_entity.go), which is a query
// parameter rather than a stored state. The column it maps to is still
// `payments.status`.
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

// Payment is one attempt to collect a cart's total through the payment
// gateway (FR-5).
//
// It is deliberately not a ledger of all money received: a cashier taking
// cash or card on the POS writes nothing here, because that payment lives
// where it always has, in transactions.paid_at / wallet_id. Reporting that
// wants "everything paid" reads transactions, not payments.
//
// The relations it points at (cart, transaction) are ids only. A payment is
// polled every 3 s while a guest watches the QR (D12), and the two things
// that hang off it are aggregates of their own — the transaction with its
// items and the cart with its table — so they are loaded through their own
// repositories when a caller actually needs them, rather than joined into
// every status poll.
type Payment struct {
	Id     int64
	CartId int64
	// SessionId is the session that created this payment. It is what scopes
	// the status read: a payment is only ever returned to the session that
	// owns it (D8).
	SessionId     string
	TransactionId *int64
	// PartnerReferenceNo is our own reference (D18) and the key DOKU echoes
	// back in a notification, which is what makes the notification handler
	// idempotent (D14). Unique across payments.
	PartnerReferenceNo string
	// GatewayReferenceNo is DOKU's reference, empty until GenerateQris
	// answers.
	GatewayReferenceNo string
	Method             PaymentMethod
	Status             PaymentState
	// Amount is computed server-side from the cart at checkout and frozen
	// there (D9): once a QR carries it, a later price edit by staff can
	// change neither what the guest is asked to pay nor what we record.
	Amount    float32
	QrContent string
	ExpiredAt time.Time
	PaidAt    *time.Time
	// StatusCheckedAt is when we last asked DOKU about this payment. It is
	// what implements D12's 10 s floor, keeping a rapid client poll from
	// becoming a rapid DOKU poll.
	StatusCheckedAt *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       *time.Time
}

// IsAwaitingPayment reports whether this payment is still the live one for
// its cart at the given instant: pending, and not yet past its expiry.
//
// It is the single definition of "a pending, unexpired payment" that both
// D10's cart freeze and D11's one-QR-per-cart idempotency are written
// against, so the two cannot drift apart. The instant is a parameter rather
// than time.Now() so that callers stay testable, and expiry is exclusive —
// at exactly ExpiredAt the window is over.
//
// Note this is not the same question as "may we mark this payment expired":
// only the server past ExpiredAt *and* a confirming DOKU query may do that
// (D12a). This one only decides whether the cart stays frozen.
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
