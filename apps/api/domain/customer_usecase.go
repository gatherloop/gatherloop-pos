package domain

import (
	"context"
	"strings"
)

// maxCustomerNameLength matches customers.name's VARCHAR(60) column, so a
// too-long name is rejected here rather than truncated by MySQL (FR-4).
const maxCustomerNameLength = 60

type CustomerUsecase struct {
	repository CustomerRepository
}

func NewCustomerUsecase(repository CustomerRepository) CustomerUsecase {
	return CustomerUsecase{repository: repository}
}

// GetCurrentCustomerName returns the name this session gave last time, or an
// empty string if it never gave one. "No name yet" is the expected
// first-visit state, not an error, so this never 404s — exactly as
// GetCurrentCart never 404s for a session with no cart (FR-4).
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

// UpsertCustomerName records the name a guest gave at checkout, replacing
// whatever this session gave before (D24). It is a usecase method only —
// there is no route that writes a name, because a name is only ever recorded
// as part of a checkout (FR-6 step 1), so there is no way to store one
// without an order attached to it.
//
// Callers run it inside their own transaction; see CustomerRepository for why
// this usecase does not open one.
func (usecase CustomerUsecase) UpsertCustomerName(ctx context.Context, sessionId string, name string) (Customer, *Error) {
	name = strings.TrimSpace(name)
	if err := validateCustomerName(name); err != nil {
		return Customer{}, err
	}

	existing, err := usecase.repository.GetCustomerBySessionId(ctx, sessionId)
	if err != nil {
		if err.Type != NotFound {
			return Customer{}, err
		}
		return usecase.repository.CreateCustomer(ctx, Customer{SessionId: sessionId, Name: name})
	}

	existing.Name = name
	return usecase.repository.UpdateCustomerById(ctx, existing, existing.Id)
}

// validateCustomerName enforces the 1–60 character rule on an
// already-trimmed name (D17). Validation is length-only on purpose: rejecting
// "unrealistic" names would reject real ones, and the table label is the
// authoritative delivery target anyway, so a junk name costs nothing
// operationally.
func validateCustomerName(name string) *Error {
	if name == "" {
		return &Error{Type: BadRequest, Message: "customerName must not be empty"}
	}
	if len([]rune(name)) > maxCustomerNameLength {
		return &Error{Type: BadRequest, Message: "customerName must be at most 60 characters"}
	}
	return nil
}
