package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type ReservationRouter struct {
	handler ReservationHandler
}

func NewReservationRouter(handler ReservationHandler) ReservationRouter {
	return ReservationRouter{handler: handler}
}

func (reservationRouter ReservationRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/reservations", CheckAuth(reservationRouter.handler.GetReservationList)).Methods(http.MethodGet)
	router.HandleFunc("/reservations/{reservationId}", CheckAuth(reservationRouter.handler.GetReservationById)).Methods(http.MethodGet)
	router.HandleFunc("/reservations/{reservationId}", CheckAuth(reservationRouter.handler.DeleteReservationById)).Methods(http.MethodDelete)
	router.HandleFunc("/reservations/checkin", CheckAuth(reservationRouter.handler.CheckinReservations)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/reservations/checkout", CheckAuth(reservationRouter.handler.CheckoutReservations)).Methods(http.MethodPost, http.MethodOptions)
}
