//go:generate mockgen -source=kds_notification_repository.go -destination=../data/mock/kds_notification_repository.go -package=mock

package domain

import "context"

// The only priority a KDS push is sent at — Expo's default maps to FCM normal/APNs 5, which the OS holds until the screen wakes (D26).
const KdsPushPriorityHigh = "high"

type KdsPushMessage struct {
	To        string
	Title     string
	Body      string
	Sound     string
	ChannelId string
	Priority  string
	Data      map[string]any
}

type KdsPushReceiptStatus string

const (
	KdsPushReceiptStatusOk    KdsPushReceiptStatus = "ok"
	KdsPushReceiptStatusError KdsPushReceiptStatus = "error"
)

// The one Expo receipt error that justifies pruning a device (D18); every other error is left as free-form Message.
const KdsPushErrorCodeDeviceNotRegistered = "DeviceNotRegistered"

type KdsPushReceipt struct {
	Status    KdsPushReceiptStatus
	Message   string
	ErrorCode string
}

type KdsPushGatewayRepository interface {
	Send(ctx context.Context, messages []KdsPushMessage) ([]KdsPushReceipt, *Error)
}

type KdsNotificationRepository interface {
	// EnqueueForTransaction writes one row per (transaction, kind), and is a no-op on a
	// transaction already enqueued for that kind (D4/D8) — never an error. For order_paid, it
	// writes only when ShouldNotify is true (D24), 'skipped' instead of 'pending' when
	// IsStaleForNotification is true (D22). cash_pending, cash_cancelled and cod_verification
	// bypass both checks (D9, FR-9): none of them is a "start making it" signal, so the station
	// rule doesn't gate them, and each is enqueued the instant the transaction exists, so
	// staleness can never apply. cash_cancelled retracts cash_pending's instruction (D16);
	// cod_verification asks a barista to look at a photo before anything is made.
	EnqueueForTransaction(ctx context.Context, transaction Transaction, kind KdsNotificationKind) *Error
	// HasNotificationForTransaction reports whether a (transaction, kind) row already exists.
	// FR-7 uses it to skip cash_cancelled when the transaction never got a cash_pending push in
	// the first place, so there is nothing to retract.
	HasNotificationForTransaction(ctx context.Context, transactionId int64, kind KdsNotificationKind) (bool, *Error)
	ClaimPendingKdsNotifications(ctx context.Context, limit int) ([]KdsNotification, *Error)
	MarkKdsNotificationSent(ctx context.Context, id int64, detail string) *Error
	MarkKdsNotificationFailed(ctx context.Context, id int64, detail string) *Error
	MarkKdsNotificationSkipped(ctx context.Context, id int64, detail string) *Error
}

// KdsNotificationDispatcher lets payTransaction's two callers kick a dispatch sweep the instant
// their payment commits, without making the cashier's HTTP response wait on Expo (FR-4). It is
// implemented by KdsNotificationUsecase and injected into TransactionUsecase and PaymentUsecase
// so the dispatch trigger is a domain concern, not something re-derived per handler.
type KdsNotificationDispatcher interface {
	TriggerDispatch()
}
