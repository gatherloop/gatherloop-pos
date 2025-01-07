package routers

import (
	"apps/api/presentation/restapi"
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type ProductRouter struct {
	handler handlers.ProductHandler
}

func NewProductRouter(handler handlers.ProductHandler) ProductRouter {
	return ProductRouter{handler: handler}
}

func (productRouter ProductRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/products", restapi.CheckAuth(productRouter.handler.GetProductList)).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", restapi.CheckAuth(productRouter.handler.GetProductById)).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", restapi.CheckAuth(productRouter.handler.DeleteProductById)).Methods(http.MethodDelete)
	router.HandleFunc("/products/{productId}", restapi.CheckAuth(productRouter.handler.UpdateProductById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/products", restapi.CheckAuth(productRouter.handler.CreateProduct)).Methods(http.MethodPost, http.MethodOptions)
}
