package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
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

// GetCustomerById is the read-back the two writers below use to return a
// fully-populated row (created_at/updated_at come from the DB). It is
// deliberately not on CustomerRepository: nothing in the domain ever holds a
// customer id, only a session id, so exposing it would widen the port with a
// lookup no usecase can make.
func (repo Repository) GetCustomerById(ctx context.Context, id int64) (domain.Customer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var customer Customer
	result := db.Table("customers").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&customer)
	return ToCustomerDomain(customer), ToErrorCtx(ctx, result.Error, "GetCustomerById")
}

func (repo Repository) CreateCustomer(ctx context.Context, customer domain.Customer) (domain.Customer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToCustomerDB(customer)

	if result := db.Table("customers").Create(&payload); result.Error != nil {
		return domain.Customer{}, ToErrorCtx(ctx, result.Error, "CreateCustomer")
	}

	return repo.GetCustomerById(ctx, payload.Id)
}

func (repo Repository) UpdateCustomerById(ctx context.Context, customer domain.Customer, id int64) (domain.Customer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToCustomerDB(customer)

	if result := db.Table("customers").Where("id = ?", id).Updates(map[string]any{
		"name": payload.Name,
	}); result.Error != nil {
		return domain.Customer{}, ToErrorCtx(ctx, result.Error, "UpdateCustomerById")
	}

	return repo.GetCustomerById(ctx, id)
}
