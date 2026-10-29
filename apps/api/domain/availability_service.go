package domain

import "context"

type AvailabilityService struct {
	productRepository      ProductRepository
	variantRepository      VariantRepository
	availabilityRepository AvailabilityRepository
}

func NewAvailabilityService(
	productRepository ProductRepository,
	variantRepository VariantRepository,
	availabilityRepository AvailabilityRepository,
) AvailabilityService {
	return AvailabilityService{
		productRepository:      productRepository,
		variantRepository:      variantRepository,
		availabilityRepository: availabilityRepository,
	}
}

func (service AvailabilityService) BuildAvailabilityList(ctx context.Context) ([]AvailabilityProduct, *Error) {
	purchase := SaleTypePurchase
	published := ProductStatusPublished

	products, err := service.productRepository.GetProductList(ctx, "", CreatedAt, Ascending, 0, 0, &purchase, &published)
	if err != nil {
		return []AvailabilityProduct{}, err
	}

	availabilityProducts := make([]AvailabilityProduct, 0, len(products))
	for _, product := range products {
		availabilityProducts = append(availabilityProducts, ToAvailabilityProduct(product))
	}

	return availabilityProducts, nil
}

func (service AvailabilityService) RecordProductAvailabilityMovements(ctx context.Context, product Product, update AvailabilityProductUpdate) *Error {
	if update.AvailableQuantity != nil {
		previous := 0
		if product.AvailableQuantity != nil {
			previous = *product.AvailableQuantity
		}
		delta := *update.AvailableQuantity - previous
		resultingQuantity := *update.AvailableQuantity

		if err := service.availabilityRepository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
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

		if err := service.availabilityRepository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			ProductId: &product.Id, Reason: reason,
		}); err != nil {
			return err
		}
	}

	return nil
}

func (service AvailabilityService) RecordVariantAvailabilityMovements(ctx context.Context, variant Variant, update AvailabilityVariantUpdate) *Error {
	if update.AvailableQuantity != nil {
		previous := 0
		if variant.AvailableQuantity != nil {
			previous = *variant.AvailableQuantity
		}
		delta := *update.AvailableQuantity - previous
		resultingQuantity := *update.AvailableQuantity

		if err := service.availabilityRepository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
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

		if err := service.availabilityRepository.CreateAvailabilityMovement(ctx, AvailabilityMovement{
			VariantId: &variant.Id, Reason: reason,
		}); err != nil {
			return err
		}
	}

	return nil
}
