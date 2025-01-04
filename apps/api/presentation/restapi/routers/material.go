package routers

import (
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type MaterialRouter struct {
	handler handlers.MaterialHandler
}

func NewMaterialRouter(handler handlers.MaterialHandler) MaterialRouter {
	return MaterialRouter{handler: handler}
}

func (materialRouter MaterialRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/materials", materialRouter.handler.GetMaterialList).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", materialRouter.handler.GetMaterialById).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", materialRouter.handler.DeleteMaterialById).Methods(http.MethodDelete)
	router.HandleFunc("/materials/{materialId}", materialRouter.handler.UpdateMaterialById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/materials", materialRouter.handler.CreateMaterial).Methods(http.MethodPost, http.MethodOptions)
}
