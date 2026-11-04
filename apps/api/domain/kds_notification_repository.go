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
	EnqueueForTransaction(ctx context.Context, transaction Transaction, kind KdsNotificationKind) *Error
	HasNotificationForTransaction(ctx context.Context, transactionId int64, kind KdsNotificationKind) (bool, *Error)
	ClaimPendingKdsNotifications(ctx context.Context, limit int) ([]KdsNotification, *Error)
	MarkKdsNotificationSent(ctx context.Context, id int64, detail string) *Error
	MarkKdsNotificationFailed(ctx context.Context, id int64, detail string) *Error
	MarkKdsNotificationSkipped(ctx context.Context, id int64, detail string) *Error
}

type KdsNotificationDispatcher interface {
	TriggerDispatch()
}
