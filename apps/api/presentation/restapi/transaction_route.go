package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type TransactionRouter struct {
	handler TransactionHandler
}

func NewTransactionRouter(handler TransactionHandler) TransactionRouter {
	return TransactionRouter{handler: handler}
}

func (transactionRouter TransactionRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/transactions", CheckAuth(transactionRouter.handler.GetTransactionList)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/statistics", CheckAuth(transactionRouter.handler.GetTransactionStatistics)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", CheckAuth(transactionRouter.handler.GetTransactionById)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", CheckAuth(transactionRouter.handler.UpdateTransactionById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}", CheckAuth(transactionRouter.handler.DeleteTransactionById)).Methods(http.MethodDelete)
	router.HandleFunc("/transactions/{transactionId}/pay", CheckAuth(transactionRouter.handler.PayTransaction)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}/unpay", CheckAuth(transactionRouter.handler.UnpayTransaction)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions", CheckAuth(transactionRouter.handler.CreateTransaction)).Methods(http.MethodPost, http.MethodOptions)
}
