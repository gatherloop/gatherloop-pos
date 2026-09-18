//go:generate mockgen -source=guest_notification_repository.go -destination=../data/mock/guest_notification_repository.go -package=mock

package domain

import "context"

type GuestNotificationRepository interface {
	// EnqueueForCompletedTransaction writes one row for a transaction that just became complete,
	// idempotent by transaction_id (a double completion is a no-op, not a second row). A nil
	// sessionId records a 'skipped' row — there was no payment to resolve a guest from — rather
	// than failing the completion (FR-2).
	EnqueueForCompletedTransaction(ctx context.Context, transaction Transaction, sessionId *string) *Error
	ClaimPendingGuestNotifications(ctx context.Context, limit int) ([]GuestNotification, *Error)
	MarkGuestNotificationSent(ctx context.Context, id int64, detail string) *Error
	MarkGuestNotificationFailed(ctx context.Context, id int64, detail string) *Error
	MarkGuestNotificationSkipped(ctx context.Context, id int64, detail string) *Error
	// DeleteGuestNotificationByTransactionId is called from UncompleteTransaction (D7): the
	// correction removed the fact the row recorded, so the next completion must enqueue fresh
	// rather than be suppressed by the unique key.
	DeleteGuestNotificationByTransactionId(ctx context.Context, transactionId int64) *Error
}

// GuestNotificationDispatcher lets CompleteTransaction kick a dispatch sweep the instant its
// completion commits, without making the barista's HTTP response wait on a push service (FR-4).
// It is implemented by GuestNotificationUsecase and injected into TransactionUsecase so the
// dispatch trigger is a domain concern, not something re-derived per handler — mirrors
// KdsNotificationDispatcher.
type GuestNotificationDispatcher interface {
	TriggerDispatch()
}
