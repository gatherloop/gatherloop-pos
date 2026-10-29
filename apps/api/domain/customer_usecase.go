package domain

import (
	"context"
)

type CustomerUsecase struct {
	customerRepository CustomerRepository
}

func NewCustomerUsecase(customerRepository CustomerRepository) CustomerUsecase {
	return CustomerUsecase{customerRepository: customerRepository}
}

func (usecase CustomerUsecase) GetCurrentCustomer(ctx context.Context, sessionId string) (Customer, *Error) {
	customer, err := usecase.customerRepository.GetCustomerBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return Customer{}, nil
		}
		return Customer{}, err
	}
	return customer, nil
}
