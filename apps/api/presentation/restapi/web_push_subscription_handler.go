package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type WebPushSubscriptionHandler struct {
	usecase domain.WebPushSubscriptionUsecase
}

func NewWebPushSubscriptionHandler(usecase domain.WebPushSubscriptionUsecase) WebPushSubscriptionHandler {
	return WebPushSubscriptionHandler{usecase: usecase}
}

func (handler WebPushSubscriptionHandler) SubscribeWebPush(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	request, err := GetWebPushSubscriptionRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	subscription, usecaseErr := handler.usecase.SubscribeWebPush(ctx, ToWebPushSubscription(sessionId, request))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.WebPushSubscriptionResponse{Data: ToApiWebPushSubscription(subscription)})
}

func (handler WebPushSubscriptionHandler) UnsubscribeWebPush(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionId := GetSessionId(r)

	request, err := GetWebPushSubscriptionDeleteRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.UnsubscribeWebPush(ctx, sessionId, request.Endpoint); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
