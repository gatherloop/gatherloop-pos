package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type CategoryRouter struct {
	handler CategoryHandler
}

func NewCategoryRouter(handler CategoryHandler) CategoryRouter {
	return CategoryRouter{handler: handler}
}

func (categoryRouter CategoryRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/categories", CheckAuth(categoryRouter.handler.GetCategoryList)).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", CheckAuth(categoryRouter.handler.GetCategoryById)).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", CheckAuth(categoryRouter.handler.DeleteCategoryById)).Methods(http.MethodDelete)
	router.HandleFunc("/categories/{categoryId}", CheckAuth(categoryRouter.handler.UpdateCategoryById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/categories", CheckAuth(categoryRouter.handler.CreateCategory)).Methods(http.MethodPost, http.MethodOptions)
}
