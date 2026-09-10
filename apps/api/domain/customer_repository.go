//go:generate mockgen -source=customer_repository.go -destination=../data/mock/customer_repository.go -package=mock

package domain

import "context"

type CustomerRepository interface {
	GetCustomerBySessionId(ctx context.Context, sessionId string) (Customer, *Error)
	UpsertCustomerBySessionId(ctx context.Context, sessionId string, name string) (Customer, *Error)
}
