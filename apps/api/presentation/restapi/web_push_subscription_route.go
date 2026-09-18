package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type WebPushSubscriptionRouter struct {
	handler WebPushSubscriptionHandler
}

func NewWebPushSubscriptionRouter(handler WebPushSubscriptionHandler) WebPushSubscriptionRouter {
	return WebPushSubscriptionRouter{handler: handler}
}

func (webPushSubscriptionRouter WebPushSubscriptionRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/web-push/subscriptions", RequireSessionId(webPushSubscriptionRouter.handler.SubscribeWebPush)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/web-push/subscriptions", RequireSessionId(webPushSubscriptionRouter.handler.UnsubscribeWebPush)).Methods(http.MethodDelete, http.MethodOptions)
}
