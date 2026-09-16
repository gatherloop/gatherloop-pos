package domain

import (
	"context"
	"fmt"
)

type AvailabilityUsecase struct {
	repository        AvailabilityRepository
	productRepository ProductRepository
	variantRepository VariantRepository
}

func NewAvailabilityUsecase(repository AvailabilityRepository, productRepository ProductRepository, variantRepository VariantRepository) AvailabilityUsecase {
	return AvailabilityUsecase{
		repository:        repository,
		productRepository: productRepository,
		variantRepository: variantRepository,
	}
}

func (usecase AvailabilityUsecase) GetAvailabilityList(ctx context.Context) ([]AvailabilityProduct, *Error) {
	return usecase.buildAvailabilityList(ctx)
}

func (usecase AvailabilityUsecase) buildAvailabilityList(ctx context.Context) ([]AvailabilityProduct, *Error) {
	purchase := SaleTypePurchase
	published := ProductStatusPublished

	products, err := usecase.productRepository.GetProductList(ctx, "", CreatedAt, Ascending, 0, 0, &purchase, &published)
	if err != nil {
		return []AvailabilityProduct{}, err
	}

	availabilityProducts := make([]AvailabilityProduct, 0, len(products))
	for _, product := range products {
		productId := int(product.Id)
		variants, err := usecase.variantRepository.GetVariantList(ctx, "", CreatedAt, Ascending, 0, 0, &productId, []int{})
		if err != nil {
			return []AvailabilityProduct{}, err
		}

		availabilityProducts = append(availabilityProducts, ToAvailabilityProduct(product, variants))
	}

	return availabilityProducts, nil
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

	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		for _, productUpdate := range productUpdates {
			if err := usecase.repository.UpdateProductAvailability(ctxWithTx, productUpdate.ProductId, productUpdate.IsAvailable, productUpdate.AvailableQuantity); err != nil {
				return err
			}

			if err := usecase.recordProductAvailabilityMovements(ctxWithTx, products[productUpdate.ProductId], productUpdate); err != nil {
				return err
			}
		}

		for _, variantUpdate := range variantUpdates {
			if err := usecase.repository.UpdateVariantAvailability(ctxWithTx, variantUpdate.VariantId, variantUpdate.IsAvailable, variantUpdate.AvailableQuantity); err != nil {
				return err
			}

			if err := usecase.recordVariantAvailabilityMovements(ctxWithTx, variants[variantUpdate.VariantId], variantUpdate); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return []AvailabilityProduct{}, err
	}

	return usecase.buildAvailabilityList(ctx)
}

func (usecase AvailabilityUsecase) recordProductAvailabilityMovements(ctx context.Context, product Product, update AvailabilityProductUpdate) *Error {
	if update.AvailableQuantity != nil {
		previous := 0
		if product.AvailableQuantity != nil {
			previous = *product.AvailableQuantity
		}
		delta := *update.AvailableQuantity - previous
		resultingQuantity := *update.AvailableQuantity

		if err := usecase.repository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			ProductId: &product.Id, Delta: &delta, ResultingQuantity: &resultingQuantity,
			Reason: AvailabilityMovementReasonManualSet,
		}); err != nil {
			return err
		}
	}

	if update.IsAvailable != nil && *update.IsAvailable != product.IsAvailable {
		reason := AvailabilityMovementReasonSwitchedOn
		if !*update.IsAvailable {
			reason = AvailabilityMovementReasonSwitchedOff
		}

		if err := usecase.repository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			ProductId: &product.Id, Reason: reason,
		}); err != nil {
			return err
		}
	}

	return nil
}

func (usecase AvailabilityUsecase) recordVariantAvailabilityMovements(ctx context.Context, variant Variant, update AvailabilityVariantUpdate) *Error {
	if update.AvailableQuantity != nil {
		previous := 0
		if variant.AvailableQuantity != nil {
			previous = *variant.AvailableQuantity
		}
		delta := *update.AvailableQuantity - previous
		resultingQuantity := *update.AvailableQuantity

		if err := usecase.repository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			VariantId: &variant.Id, Delta: &delta, ResultingQuantity: &resultingQuantity,
			Reason: AvailabilityMovementReasonManualSet,
		}); err != nil {
			return err
		}
	}

	if update.IsAvailable != nil && *update.IsAvailable != variant.IsAvailable {
		reason := AvailabilityMovementReasonSwitchedOn
		if !*update.IsAvailable {
			reason = AvailabilityMovementReasonSwitchedOff
		}

		if err := usecase.repository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			VariantId: &variant.Id, Reason: reason,
		}); err != nil {
			return err
		}
	}

	return nil
}

func (usecase AvailabilityUsecase) GetAvailabilityMovementList(ctx context.Context, level AvailabilityMovementLevel, id int64, skip int, limit int) ([]AvailabilityMovement, int64, *Error) {
	if level != AvailabilityMovementLevelProduct && level != AvailabilityMovementLevelVariant {
		return []AvailabilityMovement{}, 0, &Error{Type: BadRequest, Message: "level must be product or variant"}
	}

	movements, err := usecase.repository.GetAvailabilityMovementList(ctx, level, id, skip, limit)
	if err != nil {
		return []AvailabilityMovement{}, 0, err
	}

	total, err := usecase.repository.GetAvailabilityMovementListTotal(ctx, level, id)
	if err != nil {
		return []AvailabilityMovement{}, 0, err
	}

	return movements, total, nil
}
