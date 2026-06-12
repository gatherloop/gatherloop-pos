package mysql

import "apps/api/domain"

func ToTicketDB(domainTicket domain.Ticket) Ticket {
	return Ticket{
		Id:        domainTicket.Id,
		Code:      domainTicket.Code,
		Name:      domainTicket.Name,
		CreatedAt: domainTicket.CreatedAt,
		DeletedAt: domainTicket.DeletedAt,
	}
}

func ToTicketDomain(dbTicket Ticket) domain.Ticket {
	return domain.Ticket{
		Id:        dbTicket.Id,
		Code:      dbTicket.Code,
		Name:      dbTicket.Name,
		CreatedAt: dbTicket.CreatedAt,
		DeletedAt: dbTicket.DeletedAt,
	}
}

func ToTicketListDomain(dbTickets []Ticket) []domain.Ticket {
	var domainTickets []domain.Ticket
	for _, dbTicket := range dbTickets {
		domainTickets = append(domainTickets, ToTicketDomain(dbTicket))
	}
	return domainTickets
}
