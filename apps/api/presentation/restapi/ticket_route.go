package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type TicketRouter struct {
	handler TicketHandler
}

func NewTicketRouter(handler TicketHandler) TicketRouter {
	return TicketRouter{handler: handler}
}

func (ticketRouter TicketRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/tickets", CheckAuth(ticketRouter.handler.GetTicketList)).Methods(http.MethodGet)
	router.HandleFunc("/tickets/{ticketId}", CheckAuth(ticketRouter.handler.GetTicketById)).Methods(http.MethodGet)
	router.HandleFunc("/tickets/{ticketId}", CheckAuth(ticketRouter.handler.DeleteTicketById)).Methods(http.MethodDelete)
	router.HandleFunc("/tickets/{ticketId}", CheckAuth(ticketRouter.handler.UpdateTicketById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/tickets", CheckAuth(ticketRouter.handler.CreateTicket)).Methods(http.MethodPost, http.MethodOptions)
}
