package mysql

import "time"

type WebPushSubscription struct {
	Id         int64
	SessionId  string
	Endpoint   string
	P256dhKey  string
	AuthKey    string
	UserAgent  string
	CreatedAt  time.Time
	LastSeenAt *time.Time
	DeletedAt  *time.Time
}
