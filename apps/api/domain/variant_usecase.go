package domain

import (
	"context"
)

type VariantUsecase struct {
	variantRepository VariantRepository
	productRepository ProductRepository
	variantService    VariantService
}

func NewVariantUsecase(variantRepository VariantRepository, productRepository ProductRepository, variantService VariantService) VariantUsecase {
	return VariantUsecase{
		variantRepository: variantRepository,
		productRepository: productRepository,
		variantService:    variantService,
	}
}

func (usecase VariantUsecase) GetVariantList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, productId *int, optionValueIds []int) ([]Variant, int64, *Error) {
	variants, err := usecase.variantRepository.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if err != nil {
		return []Variant{}, 0, err
	}

	total, err := usecase.variantRepository.GetVariantListTotal(ctx, query)
	if err != nil {
		return []Variant{}, 0, err
	}

	return variants, total, nil
}

func (usecase VariantUsecase) GetVariantById(ctx context.Context, id int64) (Variant, *Error) {
	return usecase.variantRepository.GetVariantById(ctx, id)
}

func (usecase VariantUsecase) CreateVariant(ctx context.Context, variant Variant) (Variant, *Error) {
	product, err := usecase.productRepository.GetProductById(ctx, variant.ProductId)
	if err != nil {
		return Variant{}, err
	}

	if err := usecase.variantService.ValidateVariantForSaleType(product.SaleType, &variant); err != nil {
		return Variant{}, err
	}

	if variant.TagIds == nil {
		created, err := usecase.variantRepository.CreateVariant(ctx, variant)
		if err != nil {
			return Variant{}, err
		}

		created.Product = product
		return created, nil
	}

	var created Variant
	err = usecase.variantRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if err := usecase.variantService.ValidateTagIds(ctxWithTx, variant.TagIds); err != nil {
			return err
		}

		createdVariant, err := usecase.variantRepository.CreateVariant(ctxWithTx, variant)
		if err != nil {
			return err
		}

		if err := usecase.variantService.ReplaceVariantTags(ctxWithTx, createdVariant.Id, variant.TagIds); err != nil {
			return err
		}

		created, err = usecase.variantRepository.GetVariantById(ctxWithTx, createdVariant.Id)
		return err
	})
	if err != nil {
		return Variant{}, err
	}

	created.Product = product
	return created, nil
}

func (usecase VariantUsecase) UpdateVariantById(ctx context.Context, variant Variant, id int64) (Variant, *Error) {
	var updateResult Variant
	var product Product
	err := usecase.variantRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, err := usecase.variantRepository.GetVariantById(ctxWithTx, id)
		if err != nil {
			return err
		}

		existingProduct, err := usecase.productRepository.GetProductById(ctxWithTx, existing.ProductId)
		if err != nil {
			return err
		}
		product = existingProduct

		if err := usecase.variantService.ValidateVariantForSaleType(product.SaleType, &variant); err != nil {
			return err
		}

		if variant.TagIds != nil {
			if err := usecase.variantService.ValidateTagIds(ctxWithTx, variant.TagIds); err != nil {
				return err
			}
			if err := usecase.variantService.ReplaceVariantTags(ctxWithTx, id, variant.TagIds); err != nil {
				return err
			}
		}

		updated, err := usecase.variantRepository.UpdateVariantById(ctxWithTx, variant, id)
		if err != nil {
			return err
		}

		updateResult = updated
		return nil
	})
	if err != nil {
		return Variant{}, err
	}

	updateResult.Product = product
	return updateResult, nil
}

func (usecase VariantUsecase) DeleteVariantById(ctx context.Context, id int64) *Error {
	return usecase.variantRepository.DeleteVariantById(ctx, id)
}
