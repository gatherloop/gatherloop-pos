package mysql

import "time"

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
