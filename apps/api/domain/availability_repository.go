//go:generate mockgen -source=availability_repository.go -destination=../data/mock/availability_repository.go -package=mock

package domain

import "context"

type AvailabilityRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	UpdateProductAvailability(ctx context.Context, productId int64, isAvailable *bool, availableQuantity *int) *Error
	UpdateVariantAvailability(ctx context.Context, variantId int64, isAvailable *bool, availableQuantity *int) *Error
	CreateAvailabilityMovement(ctx context.Context, movement AvailabilityMovement) *Error
	GetAvailabilityMovementList(ctx context.Context, level AvailabilityMovementLevel, id int64, skip int, limit int) ([]AvailabilityMovement, *Error)
	GetAvailabilityMovementListTotal(ctx context.Context, level AvailabilityMovementLevel, id int64) (int64, *Error)
}
