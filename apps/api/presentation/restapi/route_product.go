package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type ProductRouter struct {
	handler ProductHandler
}

func NewProductRouter(handler ProductHandler) ProductRouter {
	return ProductRouter{handler: handler}
}

func (productRouter ProductRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/products", CheckAuth(productRouter.handler.GetProductList)).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", CheckAuth(productRouter.handler.GetProductById)).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", CheckAuth(productRouter.handler.DeleteProductById)).Methods(http.MethodDelete)
	router.HandleFunc("/products/{productId}", CheckAuth(productRouter.handler.UpdateProductById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/products", CheckAuth(productRouter.handler.CreateProduct)).Methods(http.MethodPost, http.MethodOptions)
}
