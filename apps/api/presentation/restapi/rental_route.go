package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type RentalRouter struct {
	handler RentalHandler
}

func NewRentalRouter(handler RentalHandler) RentalRouter {
	return RentalRouter{handler: handler}
}

func (rentalRouter RentalRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/rentals", CheckAuth(rentalRouter.handler.GetRentalList)).Methods(http.MethodGet)
	router.HandleFunc("/rentals/{rentalId}", CheckAuth(rentalRouter.handler.GetRentalById)).Methods(http.MethodGet)
	router.HandleFunc("/rentals/{rentalId}", CheckAuth(rentalRouter.handler.DeleteRentalById)).Methods(http.MethodDelete)
	router.HandleFunc("/rentals/checkin", CheckAuth(rentalRouter.handler.CheckinRentals)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/rentals/checkout", CheckAuth(rentalRouter.handler.CheckoutRentals)).Methods(http.MethodPost, http.MethodOptions)
}
