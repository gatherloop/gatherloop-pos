package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type PaymentVerificationRouter struct {
	handler PaymentVerificationHandler
}

func NewPaymentVerificationRouter(handler PaymentVerificationHandler) PaymentVerificationRouter {
	return PaymentVerificationRouter{handler: handler}
}

func (paymentVerificationRouter PaymentVerificationRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/transactions/{transactionId}/verification", CheckAuth(paymentVerificationRouter.handler.GetVerification)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}/verification/approve", CheckAuth(paymentVerificationRouter.handler.Approve)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}/verification/reject", CheckAuth(paymentVerificationRouter.handler.Reject)).Methods(http.MethodPut, http.MethodOptions)
}
