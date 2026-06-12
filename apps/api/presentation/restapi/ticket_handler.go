package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type TicketHandler struct {
	usecase domain.TicketUsecase
}

func NewTicketHandler(usecase domain.TicketUsecase) TicketHandler {
	return TicketHandler{usecase: usecase}
}

func (handler TicketHandler) GetTicketList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tickets, err := handler.usecase.GetTicketList(ctx)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiTickets := []apiContract.Ticket{}
	for _, ticket := range tickets {
		apiTickets = append(apiTickets, ToApiTicket(ticket))
	}

	WriteResponse(w, apiContract.TicketListResponse{Data: apiTickets})
}

func (handler TicketHandler) GetTicketById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTicketId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	ticket, baseError := handler.usecase.GetTicketById(ctx, id)
	if baseError != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(baseError.Type), Message: baseError.Message})
		return
	}

	WriteResponse(w, apiContract.TicketFindByIdResponse{Data: ToApiTicket(ticket)})
}

func (handler TicketHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	ticketRequest, err := GetTicketRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	ticket, usecaseErr := handler.usecase.CreateTicket(ctx, ToTicket(ticketRequest))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TicketCreateResponse{Data: ToApiTicket(ticket)})
}

func (handler TicketHandler) UpdateTicketById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTicketId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	ticketRequest, err := GetTicketRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	ticket, usecaseErr := handler.usecase.UpdateTicketById(ctx, ToTicket(ticketRequest), id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TicketUpdateByIdResponse{Data: ToApiTicket(ticket)})
}

func (handler TicketHandler) DeleteTicketById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTicketId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTicketById(ctx, id); err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
