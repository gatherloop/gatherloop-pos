package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type PublicRouter struct {
	handler PublicHandler
}

func NewPublicRouter(handler PublicHandler) PublicRouter {
	return PublicRouter{handler: handler}
}

func (publicRouter PublicRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/public/categories", publicRouter.handler.GetCategoryList).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/products", publicRouter.handler.GetProductList).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/products/{productId}", publicRouter.handler.GetProductById).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/variants", publicRouter.handler.GetVariantList).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/tables/{code}", publicRouter.handler.GetTableByCode).Methods(http.MethodGet, http.MethodOptions)
}
