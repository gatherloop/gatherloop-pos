package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type MaterialRouter struct {
	handler MaterialHandler
}

func NewMaterialRouter(handler MaterialHandler) MaterialRouter {
	return MaterialRouter{handler: handler}
}

func (materialRouter MaterialRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/materials", CheckAuth(materialRouter.handler.GetMaterialList)).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", CheckAuth(materialRouter.handler.GetMaterialById)).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", CheckAuth(materialRouter.handler.DeleteMaterialById)).Methods(http.MethodDelete)
	router.HandleFunc("/materials/{materialId}", CheckAuth(materialRouter.handler.UpdateMaterialById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/materials", CheckAuth(materialRouter.handler.CreateMaterial)).Methods(http.MethodPost, http.MethodOptions)
}
