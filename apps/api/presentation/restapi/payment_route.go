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

const checkoutMaxRequestBytes = 2 * 1024 * 1024

func limitCheckoutBody(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, checkoutMaxRequestBytes)
		next.ServeHTTP(w, r)
	})
}

func (paymentRouter PaymentRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/carts/current/checkout", limitCheckoutBody(RequireSessionId(paymentRouter.handler.Checkout))).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/payments", RequireSessionId(paymentRouter.handler.GetPaymentList)).Methods(http.MethodGet)
	router.HandleFunc("/payments/{partnerReferenceNo}", RequireSessionId(paymentRouter.handler.GetPaymentByPartnerReferenceNo)).Methods(http.MethodGet)
	router.HandleFunc("/payments/{partnerReferenceNo}/cancel", RequireSessionId(paymentRouter.handler.Cancel)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/payments/doku/notification", VerifyDokuSignature(paymentRouter.handler.Notification)).Methods(http.MethodPost, http.MethodOptions)
}
