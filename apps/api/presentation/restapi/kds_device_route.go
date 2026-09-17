package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type KdsDeviceRouter struct {
	handler KdsDeviceHandler
}

func NewKdsDeviceRouter(handler KdsDeviceHandler) KdsDeviceRouter {
	return KdsDeviceRouter{handler: handler}
}

func (kdsDeviceRouter KdsDeviceRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/kds/devices", CheckAuth(kdsDeviceRouter.handler.GetKdsDeviceList)).Methods(http.MethodGet)
	router.HandleFunc("/kds/devices", CheckAuth(kdsDeviceRouter.handler.RegisterKdsDevice)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/kds/devices/{kdsDeviceId}", CheckAuth(kdsDeviceRouter.handler.DeleteKdsDeviceById)).Methods(http.MethodDelete, http.MethodOptions)
}
