//go:generate mockgen -source=guest_notification_port.go -destination=../data/mock/guest_notification_port.go -package=mock

package domain

import (
	"context"
	"time"
)

type GuestNotificationRepoPort interface {
	EnqueueForCompletedTransaction(ctx context.Context, transaction Transaction, sessionId *string, whatsappNumber *string) *Error
	ClaimPendingGuestNotifications(ctx context.Context, limit int) ([]GuestNotification, *Error)
	MarkGuestNotificationSent(ctx context.Context, id int64, providerMessageId string) *Error
	MarkGuestNotificationFailed(ctx context.Context, id int64, detail string) *Error
	MarkGuestNotificationUnknownOutcome(ctx context.Context, id int64, detail string) *Error
	MarkGuestNotificationSkipped(ctx context.Context, id int64, detail string) *Error
	ExpireStaleSending(ctx context.Context, now time.Time) *Error
}
