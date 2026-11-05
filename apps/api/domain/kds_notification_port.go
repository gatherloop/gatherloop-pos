//go:generate mockgen -source=kds_notification_port.go -destination=../data/mock/kds_notification_port.go -package=mock

package domain

import "context"

type KdsNotificationGatewayPort interface {
	Send(ctx context.Context, messages []KdsPushMessage) ([]KdsPushReceipt, *Error)
}

type KdsNotificationRepoPort interface {
	EnqueueForTransaction(ctx context.Context, transaction Transaction, kind KdsNotificationKind) *Error
	HasNotificationForTransaction(ctx context.Context, transactionId int64, kind KdsNotificationKind) (bool, *Error)
	ClaimPendingKdsNotifications(ctx context.Context, limit int) ([]KdsNotification, *Error)
	MarkKdsNotificationSent(ctx context.Context, id int64, detail string) *Error
	MarkKdsNotificationFailed(ctx context.Context, id int64, detail string) *Error
	MarkKdsNotificationSkipped(ctx context.Context, id int64, detail string) *Error
}
