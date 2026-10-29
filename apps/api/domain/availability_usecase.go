package domain

import (
	"context"
	"fmt"
)

type AvailabilityUsecase struct {
	availabilityRepository AvailabilityRepository
	productRepository      ProductRepository
	variantRepository      VariantRepository
	availabilityService    AvailabilityService
}

func NewAvailabilityUsecase(availabilityRepository AvailabilityRepository, productRepository ProductRepository, variantRepository VariantRepository) AvailabilityUsecase {
	return AvailabilityUsecase{
		availabilityRepository: availabilityRepository,
		productRepository:      productRepository,
		variantRepository:      variantRepository,
		availabilityService:    NewAvailabilityService(productRepository, variantRepository, availabilityRepository),
	}
}

func (usecase AvailabilityUsecase) GetAvailabilityList(ctx context.Context) ([]AvailabilityProduct, *Error) {
	return usecase.availabilityService.BuildAvailabilityList(ctx)
}

func (usecase AvailabilityUsecase) UpdateAvailability(ctx context.Context, productUpdates []AvailabilityProductUpdate, variantUpdates []AvailabilityVariantUpdate) ([]AvailabilityProduct, *Error) {
	products := map[int64]Product{}
	for _, productUpdate := range productUpdates {
		if productUpdate.AvailableQuantity != nil && *productUpdate.AvailableQuantity < 0 {
			return []AvailabilityProduct{}, &Error{Type: BadRequest, Message: "available quantity cannot be negative"}
		}

		product, err := usecase.productRepository.GetProductById(ctx, productUpdate.ProductId)
		if err != nil {
			return []AvailabilityProduct{}, err
		}

		if productUpdate.AvailableQuantity != nil && product.AvailabilityTracking != AvailabilityTrackingProduct {
			return []AvailabilityProduct{}, &Error{Type: BadRequest, Message: fmt.Sprintf("%s does not track quantity at the product level", product.Name)}
		}

		products[productUpdate.ProductId] = product
	}

	variants := map[int64]Variant{}
	for _, variantUpdate := range variantUpdates {
		if variantUpdate.AvailableQuantity != nil && *variantUpdate.AvailableQuantity < 0 {
			return []AvailabilityProduct{}, &Error{Type: BadRequest, Message: "available quantity cannot be negative"}
		}

		variant, err := usecase.variantRepository.GetVariantById(ctx, variantUpdate.VariantId)
		if err != nil {
			return []AvailabilityProduct{}, err
		}

		if variantUpdate.AvailableQuantity != nil && variant.Product.AvailabilityTracking != AvailabilityTrackingVariant {
			return []AvailabilityProduct{}, &Error{Type: BadRequest, Message: fmt.Sprintf("%s does not track quantity at the variant level", variant.Name)}
		}

		variants[variantUpdate.VariantId] = variant
	}

	err := usecase.availabilityRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		for _, productUpdate := range productUpdates {
			if err := usecase.availabilityRepository.UpdateProductAvailability(ctxWithTx, productUpdate.ProductId, productUpdate.IsAvailable, productUpdate.AvailableQuantity); err != nil {
				return err
			}

			if err := usecase.availabilityService.RecordProductAvailabilityMovements(ctxWithTx, products[productUpdate.ProductId], productUpdate); err != nil {
				return err
			}
		}

		for _, variantUpdate := range variantUpdates {
			if err := usecase.availabilityRepository.UpdateVariantAvailability(ctxWithTx, variantUpdate.VariantId, variantUpdate.IsAvailable, variantUpdate.AvailableQuantity); err != nil {
				return err
			}

			if err := usecase.availabilityService.RecordVariantAvailabilityMovements(ctxWithTx, variants[variantUpdate.VariantId], variantUpdate); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return []AvailabilityProduct{}, err
	}

	return usecase.availabilityService.BuildAvailabilityList(ctx)
}

func (usecase AvailabilityUsecase) GetAvailabilityMovementList(ctx context.Context, level AvailabilityMovementLevel, id int64, skip int, limit int) ([]AvailabilityMovement, int64, *Error) {
	if level != AvailabilityMovementLevelProduct && level != AvailabilityMovementLevelVariant {
		return []AvailabilityMovement{}, 0, &Error{Type: BadRequest, Message: "level must be product or variant"}
	}

	movements, err := usecase.availabilityRepository.GetAvailabilityMovementList(ctx, level, id, skip, limit)
	if err != nil {
		return []AvailabilityMovement{}, 0, err
	}

	total, err := usecase.availabilityRepository.GetAvailabilityMovementListTotal(ctx, level, id)
	if err != nil {
		return []AvailabilityMovement{}, 0, err
	}

	return movements, total, nil
}
