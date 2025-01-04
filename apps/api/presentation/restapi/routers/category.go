package routers

import (
	"apps/api/presentation/restapi"
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type CategoryRouter struct {
	handler handlers.CategoryHandler
}

func NewCategoryRouter(handler handlers.CategoryHandler) CategoryRouter {
	return CategoryRouter{handler: handler}
}

func (categoryRouter CategoryRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/categories", restapi.CheckAuth(categoryRouter.handler.GetCategoryList)).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", categoryRouter.handler.GetCategoryById).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", categoryRouter.handler.DeleteCategoryById).Methods(http.MethodDelete)
	router.HandleFunc("/categories/{categoryId}", categoryRouter.handler.UpdateCategoryById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/categories", categoryRouter.handler.CreateCategory).Methods(http.MethodPost, http.MethodOptions)
}
