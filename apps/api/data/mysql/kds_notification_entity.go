package mysql

import "time"

type KdsNotification struct {
	Id            int64
	TransactionId int64
	Status        string
	AttemptCount  int
	Detail        *string
	CreatedAt     time.Time
	SentAt        *time.Time
}
