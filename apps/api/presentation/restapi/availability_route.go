package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type AvailabilityRouter struct {
	handler AvailabilityHandler
}

func NewAvailabilityRouter(handler AvailabilityHandler) AvailabilityRouter {
	return AvailabilityRouter{handler: handler}
}

func (availabilityRouter AvailabilityRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/availability", CheckAuth(availabilityRouter.handler.GetAvailabilityList)).Methods(http.MethodGet)
	router.HandleFunc("/availability", CheckAuth(availabilityRouter.handler.UpdateAvailability)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/availability/{level}/{id}/movements", CheckAuth(availabilityRouter.handler.GetAvailabilityMovementList)).Methods(http.MethodGet)
}
