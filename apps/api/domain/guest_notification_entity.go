package domain

import "time"

type GuestNotificationStatus string

const (
	GuestNotificationStatusPending GuestNotificationStatus = "pending"
	// GuestNotificationStatusSending marks a row a dispatcher has claimed but not yet resolved
	// (D8): the conditional pending → sending update lets exactly one dispatcher win a row.
	GuestNotificationStatusSending GuestNotificationStatus = "sending"
	GuestNotificationStatusSent    GuestNotificationStatus = "sent"
	GuestNotificationStatusFailed  GuestNotificationStatus = "failed"
	GuestNotificationStatusSkipped GuestNotificationStatus = "skipped"
)

// FR-7: mirrors KdsNotificationMaxAttempts — a row Fonnte keeps rejecting stops retrying and becomes failed.
const GuestNotificationMaxAttempts = 5

type GuestNotification struct {
	Id                int64
	TransactionId     int64
	SessionId         string
	WhatsappNumber    *string
	Status            GuestNotificationStatus
	AttemptCount      int
	ClaimedAt         *time.Time
	Detail            *string
	ProviderMessageId *string
	CreatedAt         time.Time
	SentAt            *time.Time
}

// GuestNotificationStaleSendingThreshold bounds how long a row may sit in `sending` before
// ExpireStaleSending gives up on it (D8): a dispatcher that dies between claiming and recording
// the outcome leaves a row that must never be resent, since "sending" means "may have sent".
const GuestNotificationStaleSendingThreshold = 5 * time.Minute
