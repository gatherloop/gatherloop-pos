package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

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
