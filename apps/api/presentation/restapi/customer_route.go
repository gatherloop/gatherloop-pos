package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type CustomerRouter struct {
	handler CustomerHandler
}

func NewCustomerRouter(handler CustomerHandler) CustomerRouter {
	return CustomerRouter{handler: handler}
}

func (customerRouter CustomerRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/customers/current", RequireSessionId(customerRouter.handler.GetCurrentCustomer)).Methods(http.MethodGet, http.MethodOptions)
}
