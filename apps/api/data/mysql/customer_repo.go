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

// GetCustomerBySessionId filters soft-deleted rows the way every other read
// here does. Note for whoever adds a delete: `uq_customers_session_id` is on
// session_id alone, so a soft-deleted row stays invisible to this read while
// still blocking a re-insert for that session. Nothing deletes a customer
// today (there is no delete route and no delete method on the port), so the
// case cannot arise yet — a delete would need the unique key widened to
// (session_id, deleted_at) first.
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
