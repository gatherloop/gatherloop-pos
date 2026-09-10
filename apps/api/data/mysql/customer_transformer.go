package mysql

import "apps/api/domain"

func ToCustomerDB(d domain.Customer) Customer {
	return Customer{
		Id:        d.Id,
		SessionId: d.SessionId,
		Name:      d.Name,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
		DeletedAt: d.DeletedAt,
	}
}

func ToCustomerDomain(db Customer) domain.Customer {
	return domain.Customer{
		Id:        db.Id,
		SessionId: db.SessionId,
		Name:      db.Name,
		CreatedAt: db.CreatedAt,
		UpdatedAt: db.UpdatedAt,
		DeletedAt: db.DeletedAt,
	}
}
