package mysql

import "time"

type KdsDevice struct {
	Id         int64
	Name       string
	PushToken  string
	Platform   string
	CreatedAt  time.Time
	LastSeenAt *time.Time
	DeletedAt  *time.Time
}
