//go:generate mockgen -source=guest_notification_repository.go -destination=../data/mock/guest_notification_repository.go -package=mock

package domain

import (
	"context"
	"time"
)

type GuestNotificationRepository interface {
	// EnqueueForCompletedTransaction writes one row for a transaction that just became complete,
	// idempotent by transaction_id (a double completion is a no-op, not a second row). A nil
	// sessionId records a 'skipped' row — there was no payment to resolve a guest from — and a
	// nil or empty whatsappNumber records a 'skipped' row too — the guest gave no number to
	// message (FR-2/FR-5) — rather than failing the completion.
	EnqueueForCompletedTransaction(ctx context.Context, transaction Transaction, sessionId *string, whatsappNumber *string) *Error
	// ClaimPendingGuestNotifications claims up to limit pending rows, oldest first, whose
	// transaction is currently completed (D7), by an atomic conditional pending → sending update
	// (D8) so two concurrent dispatchers cannot both claim the same row.
	ClaimPendingGuestNotifications(ctx context.Context, limit int) ([]GuestNotification, *Error)
	// MarkGuestNotificationSent records Fonnte's accepted outcome (FR-7 step 4): providerMessageId
	// is Fonnte's id[0], kept for support.
	MarkGuestNotificationSent(ctx context.Context, id int64, providerMessageId string) *Error
	// MarkGuestNotificationFailed records a rejected outcome (FR-7 step 4): nothing was sent, so
	// the row is retried, becoming 'failed' only once attempt_count reaches GuestNotificationMaxAttempts.
	MarkGuestNotificationFailed(ctx context.Context, id int64, detail string) *Error
	// MarkGuestNotificationUnknownOutcome records an ambiguous outcome directly as 'failed', with
	// no attempt_count change and no path back to 'pending' (D9): the send may already have
	// reached the guest, so it is never retried.
	MarkGuestNotificationUnknownOutcome(ctx context.Context, id int64, detail string) *Error
	MarkGuestNotificationSkipped(ctx context.Context, id int64, detail string) *Error
	// ExpireStaleSending moves rows that have sat in `sending` for longer than
	// GuestNotificationStaleSendingThreshold to `failed`, never to be resent (D8/D9): the
	// dispatcher that claimed them may have died mid-send, so "sending" means "may have sent".
	ExpireStaleSending(ctx context.Context, now time.Time) *Error
}

// GuestNotificationDispatcher lets CompleteTransaction kick a dispatch sweep the instant its
// completion commits, without making the barista's HTTP response wait on a push service (FR-4).
// It is implemented by GuestNotificationUsecase and injected into TransactionUsecase so the
// dispatch trigger is a domain concern, not something re-derived per handler — mirrors
// KdsNotificationDispatcher.
type GuestNotificationDispatcher interface {
	TriggerDispatch()
}
