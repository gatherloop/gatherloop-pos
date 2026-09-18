package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

func GetWebPushSubscriptionRequest(r *http.Request) (apiContract.WebPushSubscriptionRequest, error) {
	var request apiContract.WebPushSubscriptionRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func GetWebPushSubscriptionDeleteRequest(r *http.Request) (apiContract.WebPushSubscriptionDeleteRequest, error) {
	var request apiContract.WebPushSubscriptionDeleteRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func ToApiWebPushSubscription(subscription domain.WebPushSubscription) apiContract.WebPushSubscription {
	return apiContract.WebPushSubscription{
		Id:         subscription.Id,
		Endpoint:   subscription.Endpoint,
		LastSeenAt: subscription.LastSeenAt,
		CreatedAt:  subscription.CreatedAt,
	}
}

func ToWebPushSubscription(sessionId string, request apiContract.WebPushSubscriptionRequest) domain.WebPushSubscription {
	userAgent := ""
	if request.UserAgent != nil {
		userAgent = *request.UserAgent
	}

	return domain.WebPushSubscription{
		SessionId: sessionId,
		Endpoint:  request.Endpoint,
		P256dhKey: request.P256dhKey,
		AuthKey:   request.AuthKey,
		UserAgent: userAgent,
	}
}

func ToApiWebPushConfig(config domain.WebPushConfig) apiContract.WebPushConfig {
	return apiContract.WebPushConfig{VapidPublicKey: config.VapidPublicKey}
}
