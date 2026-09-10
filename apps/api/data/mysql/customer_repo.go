package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewCustomerRepository(db *gorm.DB) domain.CustomerRepository {
	return Repository{db: db}
}

func (repo Repository) GetCustomerBySessionId(ctx context.Context, sessionId string) (domain.Customer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var customer Customer
	result := db.Table("customers").
		Where("session_id = ? AND deleted_at IS NULL", sessionId).
		First(&customer)
	return ToCustomerDomain(customer), ToErrorCtx(ctx, result.Error, "GetCustomerBySessionId")
}

func (repo Repository) UpsertCustomerBySessionId(ctx context.Context, sessionId string, name string) (domain.Customer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := Customer{SessionId: sessionId, Name: name}

	result := db.Table("customers").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "session_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name"}),
		}).
		Create(&payload)
	if result.Error != nil {
		return domain.Customer{}, ToErrorCtx(ctx, result.Error, "UpsertCustomerBySessionId")
	}

	return repo.GetCustomerBySessionId(ctx, sessionId)
}
