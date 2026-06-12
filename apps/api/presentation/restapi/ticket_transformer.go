package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetTicketId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["ticketId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetTicketRequest(r *http.Request) (apiContract.TicketRequest, error) {
	var ticketRequest apiContract.TicketRequest
	err := json.NewDecoder(r.Body).Decode(&ticketRequest)
	return ticketRequest, err
}

func ToApiTicket(ticket domain.Ticket) apiContract.Ticket {
	return apiContract.Ticket{
		Id:        ticket.Id,
		Code:      ticket.Code,
		Name:      ticket.Name,
		CreatedAt: ticket.CreatedAt,
		DeletedAt: ticket.DeletedAt,
	}
}

func ToTicket(ticketRequest apiContract.TicketRequest) domain.Ticket {
	return domain.Ticket{
		Code: ticketRequest.Code,
		Name: ticketRequest.Name,
	}
}
