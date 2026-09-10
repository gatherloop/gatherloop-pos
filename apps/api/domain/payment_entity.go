package domain

import "time"

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

// NotificationHeaders carries the SNAP headers a DOKU payment notification
// arrives with — only what VerifyNotificationSignature needs to recompute
// and check the symmetric signature (D13). Never a secret, and never the
// signature of an outbound call.
type NotificationHeaders struct {
	Timestamp string
	Signature string
	PartnerId string
}
