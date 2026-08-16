package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type TableRouter struct {
	handler TableHandler
}

func NewTableRouter(handler TableHandler) TableRouter {
	return TableRouter{handler: handler}
}

func (tableRouter TableRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/tables", CheckAuth(tableRouter.handler.GetTableList)).Methods(http.MethodGet)
	router.HandleFunc("/tables/{tableId}", CheckAuth(tableRouter.handler.GetTableById)).Methods(http.MethodGet)
	router.HandleFunc("/tables/{tableId}", CheckAuth(tableRouter.handler.DeleteTableById)).Methods(http.MethodDelete)
	router.HandleFunc("/tables/{tableId}", CheckAuth(tableRouter.handler.UpdateTableById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/tables", CheckAuth(tableRouter.handler.CreateTable)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/tables/{tableId}/regenerate-code", CheckAuth(tableRouter.handler.RegenerateTableCode)).Methods(http.MethodPut, http.MethodOptions)
}
