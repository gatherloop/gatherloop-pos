package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

// PublicRouter registers the unauthenticated customer catalog routes (FR-1).
// Unlike every other router in this package, these handlers are deliberately
// not wrapped in CheckAuth — an anonymous guest has no credential.
type PublicRouter struct {
	handler PublicHandler
}

func NewPublicRouter(handler PublicHandler) PublicRouter {
	return PublicRouter{handler: handler}
}

func (publicRouter PublicRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/public/categories", publicRouter.handler.GetCategoryList).Methods(http.MethodGet)
	router.HandleFunc("/public/products", publicRouter.handler.GetProductList).Methods(http.MethodGet)
	router.HandleFunc("/public/products/{productId}", publicRouter.handler.GetProductById).Methods(http.MethodGet)
	router.HandleFunc("/public/variants", publicRouter.handler.GetVariantList).Methods(http.MethodGet)
	router.HandleFunc("/public/tables/{code}", publicRouter.handler.GetTableByCode).Methods(http.MethodGet)
}
