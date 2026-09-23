package mysql

import "time"

type GuestNotification struct {
	Id                int64
	TransactionId     int64
	SessionId         string
	WhatsappNumber    *string
	Status            string
	AttemptCount      int
	ClaimedAt         *time.Time
	Detail            *string
	ProviderMessageId *string
	CreatedAt         time.Time
	SentAt            *time.Time
}
