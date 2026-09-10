package mysql

import "time"

// Payment mirrors the `payments` table. QrContent is a pointer because the
// column is nullable: the row is inserted before DOKU has answered with a QR
// (FR-6 steps 6 and 8), so a payment briefly has none, and scanning a NULL
// into a plain string would fail.
type Payment struct {
	Id                 int64
	CartId             int64
	SessionId          string
	TransactionId      *int64
	PartnerReferenceNo string
	GatewayReferenceNo string
	Method             string
	Status             string
	Amount             float32
	QrContent          *string
	ExpiredAt          time.Time
	PaidAt             *time.Time
	StatusCheckedAt    *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
	DeletedAt          *time.Time
}
