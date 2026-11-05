package domain

import (
	"context"
)

type CustomerUsecase struct {
	customerRepoPort CustomerRepoPort
}

func NewCustomerUsecase(customerRepoPort CustomerRepoPort) CustomerUsecase {
	return CustomerUsecase{customerRepoPort: customerRepoPort}
}

func (usecase CustomerUsecase) GetCurrentCustomer(ctx context.Context, sessionId string) (Customer, *Error) {
	customer, err := usecase.customerRepoPort.GetCustomerBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return Customer{}, nil
		}
		return Customer{}, err
	}
	return customer, nil
}
