package mysql

import "time"

type GuestNotification struct {
	Id            int64
	TransactionId int64
	SessionId     string
	Status        string
	AttemptCount  int
	Detail        *string
	CreatedAt     time.Time
	SentAt        *time.Time
}
