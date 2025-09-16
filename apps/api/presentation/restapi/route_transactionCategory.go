package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type TransactionCategoryRouter struct {
	handler TransactionCategoryHandler
}

func NewTransactionCategoryRouter(handler TransactionCategoryHandler) TransactionCategoryRouter {
	return TransactionCategoryRouter{handler: handler}
}

func (transactionCategoryRouter TransactionCategoryRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/transaction-categories", CheckAuth(transactionCategoryRouter.handler.GetTransactionCategoryList)).Methods(http.MethodGet)
	router.HandleFunc("/transaction-categories/{transactionCategoryId}", CheckAuth(transactionCategoryRouter.handler.GetTransactionCategoryById)).Methods(http.MethodGet)
	router.HandleFunc("/transaction-categories/{transactionCategoryId}", CheckAuth(transactionCategoryRouter.handler.DeleteTransactionCategoryById)).Methods(http.MethodDelete)
	router.HandleFunc("/transaction-categories/{transactionCategoryId}", CheckAuth(transactionCategoryRouter.handler.UpdateTransactionCategoryById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transaction-categories", CheckAuth(transactionCategoryRouter.handler.CreateTransactionCategory)).Methods(http.MethodPost, http.MethodOptions)
}
