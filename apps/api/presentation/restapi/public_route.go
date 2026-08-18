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

// Every route below also accepts OPTIONS: gorilla/mux only runs the
// `EnableCORS` middleware (which answers a preflight itself) for a request
// whose method matches *some* registered route on that exact path — a route
// declared as GET-only fails mux's own routing before the middleware chain
// ever runs, so the browser's preflight gets a bare 405 with no CORS headers
// and the actual request never leaves the browser. This matters here more
// than on the POS-only routes: unlike those (reached same-origin through the
// Next.js proxy), these are called cross-origin, with no proxy, by the
// customer SPA (D18/D21/FR-9 in docs/prd-table-ordering.md).
func (publicRouter PublicRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/public/categories", publicRouter.handler.GetCategoryList).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/products", publicRouter.handler.GetProductList).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/products/{productId}", publicRouter.handler.GetProductById).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/variants", publicRouter.handler.GetVariantList).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/public/tables/{code}", publicRouter.handler.GetTableByCode).Methods(http.MethodGet, http.MethodOptions)
}
