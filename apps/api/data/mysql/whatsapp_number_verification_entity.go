package mysql

import "time"

type WhatsappNumberVerification struct {
	Id             int64
	WhatsappNumber string
	VerifiedAt     time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
