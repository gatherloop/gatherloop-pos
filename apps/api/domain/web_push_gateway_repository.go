//go:generate mockgen -source=web_push_gateway_repository.go -destination=../data/mock/web_push_gateway_repository.go -package=mock

package domain

import "context"

// The TTL and urgency every guest push is sent at (docs/prd-order-web-push-notifications.md
// phase 2): 900 seconds bounds how long a push service holds it, and "high" gives it the best
// chance against Android OEM battery savers.
const (
	WebPushTTLSeconds  = 900
	WebPushUrgencyHigh = "high"
)

type WebPushMessage struct {
	Endpoint  string
	P256dhKey string
	AuthKey   string
	Title     string
	Body      string
	Tag       string
	URL       string
}

type WebPushReceiptStatus string

const (
	WebPushReceiptStatusOk    WebPushReceiptStatus = "ok"
	WebPushReceiptStatusError WebPushReceiptStatus = "error"
)

// WebPushErrorCodeGone is the Web Push protocol's own signal (404/410) that a subscription is
// dead — the browser was uninstalled or site data was cleared — and it should be pruned.
const WebPushErrorCodeGone = "gone"

type WebPushReceipt struct {
	Status    WebPushReceiptStatus
	Message   string
	ErrorCode string
}

type WebPushGatewayRepository interface {
	Send(ctx context.Context, messages []WebPushMessage) ([]WebPushReceipt, *Error)
}
