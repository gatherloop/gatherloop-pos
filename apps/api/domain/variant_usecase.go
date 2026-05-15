package domain

import (
	"context"
)

type VariantUsecase struct {
	repository        VariantRepository
	productRepository ProductRepository
}

func NewVariantUsecase(repository VariantRepository, productRepository ProductRepository) VariantUsecase {
	return VariantUsecase{
		repository:        repository,
		productRepository: productRepository,
	}
}

func (usecase VariantUsecase) GetVariantList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, productId *int, optionValueIds []int) ([]Variant, int64, *Error) {
	variants, err := usecase.repository.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if err != nil {
		return []Variant{}, 0, err
	}

	total, err := usecase.repository.GetVariantListTotal(ctx, query)
	if err != nil {
		return []Variant{}, 0, err
	}

	return variants, total, nil
}

func (usecase VariantUsecase) GetVariantById(ctx context.Context, id int64) (Variant, *Error) {
	return usecase.repository.GetVariantById(ctx, id)
}

func (usecase VariantUsecase) CreateVariant(ctx context.Context, variant Variant) (Variant, *Error) {
	product, err := usecase.productRepository.GetProductById(ctx, variant.ProductId)
	if err != nil {
		return Variant{}, err
	}

	if err := usecase.validateVariantForSaleType(product.SaleType, &variant); err != nil {
		return Variant{}, err
	}

	return usecase.repository.CreateVariant(ctx, variant)
}

func (usecase VariantUsecase) UpdateVariantById(ctx context.Context, variant Variant, id int64) (Variant, *Error) {
	var updateResult Variant
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, err := usecase.repository.GetVariantById(ctxWithTx, id)
		if err != nil {
			return err
		}

		product, err := usecase.productRepository.GetProductById(ctxWithTx, existing.ProductId)
		if err != nil {
			return err
		}

		if err := usecase.validateVariantForSaleType(product.SaleType, &variant); err != nil {
			return err
		}

		updated, err := usecase.repository.UpdateVariantById(ctxWithTx, variant, id)
		if err != nil {
			return err
		}

		updateResult = updated
		return nil
	})
	return updateResult, err
}

func (usecase VariantUsecase) DeleteVariantById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteVariantById(ctx, id)
}

func (usecase VariantUsecase) validateVariantForSaleType(saleType SaleType, variant *Variant) *Error {
	switch saleType {
	case SaleTypePurchase:
		if variant.Price <= 0 {
			return &Error{Type: BadRequest, Message: "purchase variant must have price > 0"}
		}
		if len(variant.PricingTiers) > 0 {
			return &Error{Type: BadRequest, Message: "purchase variant cannot have pricing tiers"}
		}
	case SaleTypeRental:
		variant.Price = 0
		if len(variant.PricingTiers) == 0 {
			return &Error{Type: BadRequest, Message: "rental variant must have at least one pricing tier"}
		}
		for i, tier := range variant.PricingTiers {
			if tier.UpToMinutes <= 0 {
				return &Error{Type: BadRequest, Message: "pricing tier up_to_minutes must be positive"}
			}
			if tier.Price < 0 {
				return &Error{Type: BadRequest, Message: "pricing tier price must be non-negative"}
			}
			if i > 0 && tier.UpToMinutes <= variant.PricingTiers[i-1].UpToMinutes {
				return &Error{Type: BadRequest, Message: "pricing tier up_to_minutes must be strictly ascending"}
			}
		}
	}
	return nil
}
