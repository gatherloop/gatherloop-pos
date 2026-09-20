package mysql

import "time"

type KdsNotification struct {
	Id            int64
	TransactionId int64
	Kind          string
	Status        string
	AttemptCount  int
	Detail        *string
	CreatedAt     time.Time
	SentAt        *time.Time
}
