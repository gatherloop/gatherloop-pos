package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

// CustomerRouter registers the session-scoped customer route (FR-4). Like the
// cart routes it is guarded by RequireSessionId rather than CheckAuth — a
// guest has no credential, only the session ID that owns the name (D8) — and
// it declares OPTIONS explicitly so its preflight is answered by this
// registration rather than by a sibling route's.
//
// There is deliberately no write route here: a name is only ever recorded as
// part of a checkout (FR-6), so there is no way to store one without an order
// attached to it.
type CustomerRouter struct {
	handler CustomerHandler
}

func NewCustomerRouter(handler CustomerHandler) CustomerRouter {
	return CustomerRouter{handler: handler}
}

func (customerRouter CustomerRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/customers/current", RequireSessionId(customerRouter.handler.GetCurrentCustomer)).Methods(http.MethodGet, http.MethodOptions)
}
