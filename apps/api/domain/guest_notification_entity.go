package domain

import (
	"fmt"
	"time"
)

type GuestNotificationStatus string

const (
	GuestNotificationStatusPending GuestNotificationStatus = "pending"
	GuestNotificationStatusSent    GuestNotificationStatus = "sent"
	GuestNotificationStatusFailed  GuestNotificationStatus = "failed"
	GuestNotificationStatusSkipped GuestNotificationStatus = "skipped"
)

// FR-4: mirrors KdsNotificationMaxAttempts — a pending row that never gets a subscription to accept it stops retrying and becomes failed.
const GuestNotificationMaxAttempts = 5

type GuestNotification struct {
	Id            int64
	TransactionId int64
	SessionId     string
	Status        GuestNotificationStatus
	AttemptCount  int
	Detail        *string
	CreatedAt     time.Time
	SentAt        *time.Time
}

// BuildGuestPushMessage is pure and re-derived at send time (FR-5): a completed transaction
// cannot be edited, so there is nothing to snapshot against. reference is the payment's
// partnerReferenceNo, the identifier the guest's status page URL is keyed on.
func BuildGuestPushMessage(transaction Transaction, reference string) WebPushMessage {
	return WebPushMessage{
		Title: fmt.Sprintf("Pesanan #%d siap diambil!", transaction.TransactionNumber),
		Body:  "Silahkan ambil di kasir",
		Tag:   fmt.Sprintf("order-%s", reference),
		URL:   fmt.Sprintf("/orders/%s", reference),
	}
}
