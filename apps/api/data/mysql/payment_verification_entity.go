package mysql

import "time"

type PaymentVerificationPhoto struct {
	PaymentId   int64 `gorm:"primaryKey"`
	ContentType string
	ByteSize    int
	Data        []byte
	CreatedAt   time.Time
}
