package domain

import (
	"context"
)

type VariantUsecase struct {
	repository        VariantRepository
	productRepository ProductRepository
	tagRepository     TagRepository
}

func NewVariantUsecase(repository VariantRepository, productRepository ProductRepository, tagRepository TagRepository) VariantUsecase {
	return VariantUsecase{
		repository:        repository,
		productRepository: productRepository,
		tagRepository:     tagRepository,
	}
}

func (usecase VariantUsecase) GetVariantList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, productId *int, optionValueIds []int) ([]Variant, int64, *Error) {
	variants, err := usecase.repository.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if err != nil {
		return []Variant{}, 0, err
	}

	for i, variant := range variants {
		variants[i] = resolveVariantAvailability(variant, variant.Product)
	}

	total, err := usecase.repository.GetVariantListTotal(ctx, query)
	if err != nil {
		return []Variant{}, 0, err
	}

	return variants, total, nil
}

func (usecase VariantUsecase) GetVariantById(ctx context.Context, id int64) (Variant, *Error) {
	variant, err := usecase.repository.GetVariantById(ctx, id)
	if err != nil {
		return Variant{}, err
	}

	return resolveVariantAvailability(variant, variant.Product), nil
}

func (usecase VariantUsecase) CreateVariant(ctx context.Context, variant Variant) (Variant, *Error) {
	product, err := usecase.productRepository.GetProductById(ctx, variant.ProductId)
	if err != nil {
		return Variant{}, err
	}

	if err := usecase.validateVariantForSaleType(product.SaleType, &variant); err != nil {
		return Variant{}, err
	}

	if variant.TagIds == nil {
		created, err := usecase.repository.CreateVariant(ctx, variant)
		if err != nil {
			return Variant{}, err
		}
		return resolveVariantAvailability(created, product), nil
	}

	var created Variant
	err = usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if err := usecase.validateTagIds(ctxWithTx, variant.TagIds); err != nil {
			return err
		}

		createdVariant, err := usecase.repository.CreateVariant(ctxWithTx, variant)
		if err != nil {
			return err
		}

		if err := usecase.replaceVariantTags(ctxWithTx, createdVariant.Id, variant.TagIds); err != nil {
			return err
		}

		created, err = usecase.repository.GetVariantById(ctxWithTx, createdVariant.Id)
		return err
	})
	if err != nil {
		return Variant{}, err
	}

	return resolveVariantAvailability(created, product), nil
}

func (usecase VariantUsecase) UpdateVariantById(ctx context.Context, variant Variant, id int64) (Variant, *Error) {
	var updateResult Variant
	var product Product
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, err := usecase.repository.GetVariantById(ctxWithTx, id)
		if err != nil {
			return err
		}

		existingProduct, err := usecase.productRepository.GetProductById(ctxWithTx, existing.ProductId)
		if err != nil {
			return err
		}
		product = existingProduct

		if err := usecase.validateVariantForSaleType(product.SaleType, &variant); err != nil {
			return err
		}

		if variant.TagIds != nil {
			if err := usecase.validateTagIds(ctxWithTx, variant.TagIds); err != nil {
				return err
			}
			if err := usecase.replaceVariantTags(ctxWithTx, id, variant.TagIds); err != nil {
				return err
			}
		}

		updated, err := usecase.repository.UpdateVariantById(ctxWithTx, variant, id)
		if err != nil {
			return err
		}

		updateResult = updated
		return nil
	})
	if err != nil {
		return Variant{}, err
	}

	return resolveVariantAvailability(updateResult, product), nil
}

func (usecase VariantUsecase) validateTagIds(ctx context.Context, tagIds []int64) *Error {
	tags, err := usecase.tagRepository.GetTagList(ctx)
	if err != nil {
		return err
	}
	knownTagIds := map[int64]bool{}
	for _, tag := range tags {
		knownTagIds[tag.Id] = true
	}
	for _, tagId := range tagIds {
		if !knownTagIds[tagId] {
			return &Error{Type: BadRequest, Message: "tag ids contain unknown tags"}
		}
	}
	return nil
}

func (usecase VariantUsecase) replaceVariantTags(ctx context.Context, variantId int64, tagIds []int64) *Error {
	existingTagIds, err := usecase.tagRepository.GetVariantTagIds(ctx, variantId)
	if err != nil {
		return err
	}

	toVariantPairs := func(ids []int64) []VariantTagPair {
		pairs := []VariantTagPair{}
		for _, tagId := range uniqueInt64s(ids) {
			pairs = append(pairs, VariantTagPair{VariantId: variantId, TagId: tagId})
		}
		return pairs
	}

	return applyVariantTagPairs(ctx, usecase.tagRepository, toVariantPairs(existingTagIds), toVariantPairs(tagIds))
}

func resolveVariantAvailability(variant Variant, product Product) Variant {
	isSellable, sellableQuantity := ResolveVariantAvailability(product, variant)
	variant.IsSellable = isSellable
	variant.SellableQuantity = sellableQuantity

	variant.Product = product
	productIsSellable, productSellableQuantity := ResolveProductAvailability(product, []Variant{variant})
	variant.Product.IsSellable = productIsSellable
	variant.Product.SellableQuantity = productSellableQuantity

	return variant
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
