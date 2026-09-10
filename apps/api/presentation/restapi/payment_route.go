package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type PaymentRouter struct {
	handler PaymentHandler
}

func NewPaymentRouter(handler PaymentHandler) PaymentRouter {
	return PaymentRouter{handler: handler}
}

func (paymentRouter PaymentRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/carts/current/checkout", RequireSessionId(paymentRouter.handler.Checkout)).Methods(http.MethodPost, http.MethodOptions)
}
