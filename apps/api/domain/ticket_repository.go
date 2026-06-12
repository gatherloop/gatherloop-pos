//go:generate mockgen -source=ticket_repository.go -destination=../data/mock/ticket_repository.go -package=mock

package domain

import (
	"context"
)

type TicketRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetTicketList(ctx context.Context) ([]Ticket, *Error)
	GetTicketById(ctx context.Context, id int64) (Ticket, *Error)
	GetTicketByCode(ctx context.Context, code string) (Ticket, *Error)
	GetTicketByName(ctx context.Context, name string) (Ticket, *Error)
	CreateTicket(ctx context.Context, ticket Ticket) (Ticket, *Error)
	UpdateTicketById(ctx context.Context, ticket Ticket, id int64) (Ticket, *Error)
	DeleteTicketById(ctx context.Context, id int64) *Error
}
