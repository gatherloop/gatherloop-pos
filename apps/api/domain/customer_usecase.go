package domain

import (
	"context"
	"strings"
)

const maxCustomerNameLength = 60

type CustomerUsecase struct {
	repository CustomerRepository
}

func NewCustomerUsecase(repository CustomerRepository) CustomerUsecase {
	return CustomerUsecase{repository: repository}
}

func (usecase CustomerUsecase) GetCurrentCustomerName(ctx context.Context, sessionId string) (string, *Error) {
	customer, err := usecase.repository.GetCustomerBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type == NotFound {
			return "", nil
		}
		return "", err
	}
	return customer.Name, nil
}

func (usecase CustomerUsecase) UpsertCustomerName(ctx context.Context, sessionId string, name string) (Customer, *Error) {
	return upsertCustomerName(ctx, usecase.repository, sessionId, name)
}

func upsertCustomerName(ctx context.Context, repository CustomerRepository, sessionId string, name string) (Customer, *Error) {
	name = strings.TrimSpace(name)
	if err := validateCustomerName(name); err != nil {
		return Customer{}, err
	}

	return repository.UpsertCustomerBySessionId(ctx, sessionId, name)
}

func validateCustomerName(name string) *Error {
	if name == "" {
		return &Error{Type: BadRequest, Message: "customerName must not be empty"}
	}
	if len([]rune(name)) > maxCustomerNameLength {
		return &Error{Type: BadRequest, Message: "customerName must be at most 60 characters"}
	}
	return nil
}
