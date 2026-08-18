package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

// CartRouter registers the session-scoped cart routes (FR-3). Every route is
// wrapped in RequireSessionId rather than CheckAuth — an anonymous guest has
// no credential, only the session ID that is the capability bearing the
// cart (D8).
//
// Every route also accepts OPTIONS explicitly. gorilla/mux only runs the
// `EnableCORS` middleware (which answers a preflight itself) for a request
// whose method matches *some* registration on that exact path — GET/DELETE
// previously relied on a sibling PUT/POST registration on the same path
// happening to list OPTIONS too, which answered preflights by accident
// (order-dependent, not something to leave implicit) rather than because
// each route declared it needed to.
type CartRouter struct {
	handler CartHandler
}

func NewCartRouter(handler CartHandler) CartRouter {
	return CartRouter{handler: handler}
}

func (cartRouter CartRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/carts/current", RequireSessionId(cartRouter.handler.GetCurrentCart)).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/carts/current", RequireSessionId(cartRouter.handler.UpdateCartTable)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/carts/current", RequireSessionId(cartRouter.handler.ClearCart)).Methods(http.MethodDelete, http.MethodOptions)
	router.HandleFunc("/carts/current/items", RequireSessionId(cartRouter.handler.AddCartItem)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/carts/current/items/{cartItemId}", RequireSessionId(cartRouter.handler.UpdateCartItem)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/carts/current/items/{cartItemId}", RequireSessionId(cartRouter.handler.RemoveCartItem)).Methods(http.MethodDelete, http.MethodOptions)
}
