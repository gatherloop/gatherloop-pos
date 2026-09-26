package mysql

import "time"

type Payment struct {
	Id                     int64
	CartId                 int64
	SessionId              string
	CustomerWhatsappNumber *string
	TransactionId          *int64
	PartnerReferenceNo     string
	AccessKey              *string
	GatewayReferenceNo     string
	Method                 string
	Status                 string
	Amount                 float32
	QrContent              *string
	ExpiredAt              time.Time
	PaidAt                 *time.Time
	CancelledAt            *time.Time
	CancelReason           *string
	VerificationStatus     *string
	VerifiedAt             *time.Time
	StatusCheckedAt        *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
	DeletedAt              *time.Time
}
