//go:generate mockgen -source=web_push_subscription_repository.go -destination=../data/mock/web_push_subscription_repository.go -package=mock

package domain

import "context"

type WebPushSubscriptionRepository interface {
	SubscribeWebPush(ctx context.Context, subscription WebPushSubscription) (WebPushSubscription, *Error)
	UnsubscribeWebPush(ctx context.Context, sessionId string, endpoint string) *Error
	GetWebPushSubscriptionsBySessionId(ctx context.Context, sessionId string) ([]WebPushSubscription, *Error)
}
