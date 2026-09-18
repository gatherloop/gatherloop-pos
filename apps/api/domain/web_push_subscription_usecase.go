package domain

import (
	"context"
	"net/url"
)

type WebPushSubscriptionUsecase struct {
	repository     WebPushSubscriptionRepository
	vapidPublicKey string
}

func NewWebPushSubscriptionUsecase(repository WebPushSubscriptionRepository, vapidPublicKey string) WebPushSubscriptionUsecase {
	return WebPushSubscriptionUsecase{repository: repository, vapidPublicKey: vapidPublicKey}
}

func (usecase WebPushSubscriptionUsecase) GetWebPushConfig(ctx context.Context) WebPushConfig {
	return WebPushConfig{VapidPublicKey: usecase.vapidPublicKey}
}

func (usecase WebPushSubscriptionUsecase) SubscribeWebPush(ctx context.Context, subscription WebPushSubscription) (WebPushSubscription, *Error) {
	if err := validateWebPushSubscription(subscription); err != nil {
		return WebPushSubscription{}, err
	}
	return usecase.repository.SubscribeWebPush(ctx, subscription)
}

func (usecase WebPushSubscriptionUsecase) UnsubscribeWebPush(ctx context.Context, sessionId string, endpoint string) *Error {
	if endpoint == "" {
		return &Error{Type: BadRequest, Message: "endpoint must not be empty"}
	}
	return usecase.repository.UnsubscribeWebPush(ctx, sessionId, endpoint)
}

func (usecase WebPushSubscriptionUsecase) GetWebPushSubscriptionsBySessionId(ctx context.Context, sessionId string) ([]WebPushSubscription, *Error) {
	return usecase.repository.GetWebPushSubscriptionsBySessionId(ctx, sessionId)
}

func validateWebPushSubscription(subscription WebPushSubscription) *Error {
	if subscription.Endpoint == "" {
		return &Error{Type: BadRequest, Message: "endpoint must not be empty"}
	}
	if len(subscription.Endpoint) > 512 {
		return &Error{Type: BadRequest, Message: "endpoint must not exceed 512 characters"}
	}
	parsedEndpoint, parseErr := url.Parse(subscription.Endpoint)
	if parseErr != nil || parsedEndpoint.Scheme != "https" || parsedEndpoint.Host == "" {
		return &Error{Type: BadRequest, Message: "endpoint must be a valid https URL"}
	}
	if subscription.P256dhKey == "" {
		return &Error{Type: BadRequest, Message: "p256dhKey must not be empty"}
	}
	if subscription.AuthKey == "" {
		return &Error{Type: BadRequest, Message: "authKey must not be empty"}
	}
	return nil
}
