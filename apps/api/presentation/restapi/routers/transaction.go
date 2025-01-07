package routers

import (
	"apps/api/presentation/restapi"
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type TransactionRouter struct {
	handler handlers.TransactionHandler
}

func NewTransactionRouter(handler handlers.TransactionHandler) TransactionRouter {
	return TransactionRouter{handler: handler}
}

func (transactionRouter TransactionRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/transactions", restapi.CheckAuth(transactionRouter.handler.GetTransactionList)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/statistics", restapi.CheckAuth(transactionRouter.handler.GetTransactionStatistics)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", restapi.CheckAuth(transactionRouter.handler.GetTransactionById)).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", restapi.CheckAuth(transactionRouter.handler.UpdateTransactionById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}", restapi.CheckAuth(transactionRouter.handler.DeleteTransactionById)).Methods(http.MethodDelete)
	router.HandleFunc("/transactions/{transactionId}/pay", restapi.CheckAuth(transactionRouter.handler.PayTransaction)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions", restapi.CheckAuth(transactionRouter.handler.CreateTransaction)).Methods(http.MethodPost, http.MethodOptions)
}
