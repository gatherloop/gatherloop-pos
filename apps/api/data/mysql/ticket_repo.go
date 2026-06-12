package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewTicketRepository(db *gorm.DB) domain.TicketRepository {
	return Repository{db: db}
}

func (repo Repository) GetTicketList(ctx context.Context) ([]domain.Ticket, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var tickets []Ticket
	result := db.Table("tickets").Where("deleted_at", nil).Find(&tickets)
	return ToTicketListDomain(tickets), ToErrorCtx(ctx, result.Error, "GetTicketList")
}

func (repo Repository) GetTicketById(ctx context.Context, id int64) (domain.Ticket, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var ticket Ticket
	result := db.Table("tickets").Where("id = ?", id).First(&ticket)
	return ToTicketDomain(ticket), ToErrorCtx(ctx, result.Error, "GetTicketById")
}

func (repo Repository) GetTicketByCode(ctx context.Context, code string) (domain.Ticket, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var ticket Ticket
	result := db.Table("tickets").Where("code = ? AND deleted_at IS NULL", code).First(&ticket)
	return ToTicketDomain(ticket), ToErrorCtx(ctx, result.Error, "GetTicketByCode")
}

func (repo Repository) GetTicketByName(ctx context.Context, name string) (domain.Ticket, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var ticket Ticket
	result := db.Table("tickets").Where("name = ? AND deleted_at IS NULL", name).First(&ticket)
	return ToTicketDomain(ticket), ToErrorCtx(ctx, result.Error, "GetTicketByName")
}

func (repo Repository) CreateTicket(ctx context.Context, ticket domain.Ticket) (domain.Ticket, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	ticketPayload := ToTicketDB(ticket)
	result := db.Table("tickets").Create(&ticketPayload)
	return ToTicketDomain(ticketPayload), ToErrorCtx(ctx, result.Error, "CreateTicket")
}

func (repo Repository) UpdateTicketById(ctx context.Context, ticket domain.Ticket, id int64) (domain.Ticket, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	ticketPayload := ToTicketDB(ticket)
	if result := db.Table("tickets").Where("id = ?", id).Updates(&ticketPayload); result.Error != nil {
		return domain.Ticket{}, ToErrorCtx(ctx, result.Error, "UpdateTicketById")
	}

	var updatedTicket Ticket
	fetchResult := db.Table("tickets").Where("id = ?", id).First(&updatedTicket)
	return ToTicketDomain(updatedTicket), ToErrorCtx(ctx, fetchResult.Error, "UpdateTicketById")
}

func (repo Repository) DeleteTicketById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("tickets").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteTicketById")
}
