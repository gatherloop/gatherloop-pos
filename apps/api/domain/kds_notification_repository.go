//go:generate mockgen -source=kds_notification_repository.go -destination=../data/mock/kds_notification_repository.go -package=mock

package domain

import "context"

type KdsPushMessage struct {
	To        string
	Title     string
	Body      string
	Sound     string
	ChannelId string
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
