package restapi

import (
	"apps/api/domain"
	"net/http"

	"github.com/gorilla/mux"
)

type PaymentRouter struct {
	handler           PaymentHandler
	gatewayRepository domain.PaymentGatewayRepository
}

func NewPaymentRouter(handler PaymentHandler, gatewayRepository domain.PaymentGatewayRepository) PaymentRouter {
	return PaymentRouter{handler: handler, gatewayRepository: gatewayRepository}
}

func (paymentRouter PaymentRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/carts/current/checkout", RequireSessionId(paymentRouter.handler.Checkout)).Methods(http.MethodPost, http.MethodOptions)
	// Unauthenticated but signature-verified (D13) — the only write route in
	// the API that carries neither RequireSessionId nor CheckAuth.
	router.HandleFunc("/payments/doku/notification", VerifyDokuSignature(paymentRouter.gatewayRepository)(paymentRouter.handler.Notification)).Methods(http.MethodPost, http.MethodOptions)
}
