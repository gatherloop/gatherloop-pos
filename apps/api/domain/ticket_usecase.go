package domain

import (
	"context"
	"strings"
)

type TicketUsecase struct {
	ticketRepoPort TicketRepoPort
}

func NewTicketUsecase(ticketRepoPort TicketRepoPort) TicketUsecase {
	return TicketUsecase{ticketRepoPort: ticketRepoPort}
}

func (usecase TicketUsecase) GetTicketList(ctx context.Context) ([]Ticket, *Error) {
	return usecase.ticketRepoPort.GetTicketList(ctx)
}

func (usecase TicketUsecase) GetTicketById(ctx context.Context, id int64) (Ticket, *Error) {
	return usecase.ticketRepoPort.GetTicketById(ctx, id)
}

func (usecase TicketUsecase) CreateTicket(ctx context.Context, ticket Ticket) (Ticket, *Error) {
	ticket.Code = strings.TrimSpace(ticket.Code)
	ticket.Name = strings.TrimSpace(ticket.Name)

	if ticket.Code == "" {
		return Ticket{}, &Error{Type: BadRequest, Message: "code is required"}
	}
	if ticket.Name == "" {
		return Ticket{}, &Error{Type: BadRequest, Message: "name is required"}
	}

	var created Ticket
	err := usecase.ticketRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if existing, existingErr := usecase.ticketRepoPort.GetTicketByCode(ctxWithTx, ticket.Code); existingErr == nil && existing.Id > 0 {
			return &Error{Type: BadRequest, Message: "ticket code already exists"}
		}
		if existing, existingErr := usecase.ticketRepoPort.GetTicketByName(ctxWithTx, ticket.Name); existingErr == nil && existing.Id > 0 {
			return &Error{Type: BadRequest, Message: "ticket name already exists"}
		}

		result, createErr := usecase.ticketRepoPort.CreateTicket(ctxWithTx, ticket)
		if createErr != nil {
			return createErr
		}
		created = result
		return nil
	})

	return created, err
}

func (usecase TicketUsecase) UpdateTicketById(ctx context.Context, ticket Ticket, id int64) (Ticket, *Error) {
	ticket.Code = strings.TrimSpace(ticket.Code)
	ticket.Name = strings.TrimSpace(ticket.Name)

	if ticket.Code == "" {
		return Ticket{}, &Error{Type: BadRequest, Message: "code is required"}
	}
	if ticket.Name == "" {
		return Ticket{}, &Error{Type: BadRequest, Message: "name is required"}
	}

	var updated Ticket
	err := usecase.ticketRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if existing, existingErr := usecase.ticketRepoPort.GetTicketByCode(ctxWithTx, ticket.Code); existingErr == nil && existing.Id > 0 && existing.Id != id {
			return &Error{Type: BadRequest, Message: "ticket code already exists"}
		}
		if existing, existingErr := usecase.ticketRepoPort.GetTicketByName(ctxWithTx, ticket.Name); existingErr == nil && existing.Id > 0 && existing.Id != id {
			return &Error{Type: BadRequest, Message: "ticket name already exists"}
		}

		result, updateErr := usecase.ticketRepoPort.UpdateTicketById(ctxWithTx, ticket, id)
		if updateErr != nil {
			return updateErr
		}
		updated = result
		return nil
	})

	return updated, err
}

func (usecase TicketUsecase) DeleteTicketById(ctx context.Context, id int64) *Error {
	return usecase.ticketRepoPort.DeleteTicketById(ctx, id)
}
