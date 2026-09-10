package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

// PaymentRouter registers the checkout endpoint (FR-6). Its path nests under
// /carts because that is what it acts on, but it is a payment concern —
// driven by PaymentUsecase, not CartUsecase — so it lives in its own
// handler/router rather than CartRouter's, the same split payment_repository.go
// draws between the cart and payment domains. Like every other session
// route it is guarded by RequireSessionId, never CheckAuth (D8).
type PaymentRouter struct {
	handler PaymentHandler
}

func NewPaymentRouter(handler PaymentHandler) PaymentRouter {
	return PaymentRouter{handler: handler}
}

func (paymentRouter PaymentRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/carts/current/checkout", RequireSessionId(paymentRouter.handler.Checkout)).Methods(http.MethodPost, http.MethodOptions)
}
