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
	}

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
	}

	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		for _, productUpdate := range productUpdates {
			if err := usecase.repository.UpdateProductAvailability(ctxWithTx, productUpdate.ProductId, productUpdate.IsAvailable, productUpdate.AvailableQuantity); err != nil {
				return err
			}
		}

		for _, variantUpdate := range variantUpdates {
			if err := usecase.repository.UpdateVariantAvailability(ctxWithTx, variantUpdate.VariantId, variantUpdate.IsAvailable, variantUpdate.AvailableQuantity); err != nil {
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
