package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type VariantRouter struct {
	handler VariantHandler
}

func NewVariantRouter(handler VariantHandler) VariantRouter {
	return VariantRouter{handler: handler}
}

func (variantRouter VariantRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/variants", CheckAuth(variantRouter.handler.GetVariantList)).Methods(http.MethodGet)
	router.HandleFunc("/variants/{variantId}", CheckAuth(variantRouter.handler.GetVariantById)).Methods(http.MethodGet)
	router.HandleFunc("/variants/{variantId}", CheckAuth(variantRouter.handler.DeleteVariantById)).Methods(http.MethodDelete)
	router.HandleFunc("/variants/{variantId}", CheckAuth(variantRouter.handler.UpdateVariantById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/variants", CheckAuth(variantRouter.handler.CreateVariant)).Methods(http.MethodPost, http.MethodOptions)
}
