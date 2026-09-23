package mysql

import "time"

type Customer struct {
	Id             int64
	SessionId      string
	Name           string
	WhatsappNumber *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}
