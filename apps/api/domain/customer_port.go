//go:generate mockgen -source=customer_port.go -destination=../data/mock/customer_port.go -package=mock

package domain

import "context"

type CustomerRepoPort interface {
	GetCustomerBySessionId(ctx context.Context, sessionId string) (Customer, *Error)
	UpsertCustomerBySessionId(ctx context.Context, sessionId string, name string, whatsappNumber *string) (Customer, *Error)
}
