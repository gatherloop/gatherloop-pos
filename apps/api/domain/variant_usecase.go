package domain

import (
	"context"
)

type VariantUsecase struct {
	variantRepoPort VariantRepoPort
	productRepoPort ProductRepoPort
	variantService  VariantService
}

func NewVariantUsecase(variantRepoPort VariantRepoPort, productRepoPort ProductRepoPort, variantService VariantService) VariantUsecase {
	return VariantUsecase{
		variantRepoPort: variantRepoPort,
		productRepoPort: productRepoPort,
		variantService:  variantService,
	}
}

func (usecase VariantUsecase) GetVariantList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, productId *int, optionValueIds []int) ([]Variant, int64, *Error) {
	variants, err := usecase.variantRepoPort.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if err != nil {
		return []Variant{}, 0, err
	}

	total, err := usecase.variantRepoPort.GetVariantListTotal(ctx, query)
	if err != nil {
		return []Variant{}, 0, err
	}

	return variants, total, nil
}

func (usecase VariantUsecase) GetVariantById(ctx context.Context, id int64) (Variant, *Error) {
	return usecase.variantRepoPort.GetVariantById(ctx, id)
}

func (usecase VariantUsecase) CreateVariant(ctx context.Context, variant Variant) (Variant, *Error) {
	product, err := usecase.productRepoPort.GetProductById(ctx, variant.ProductId)
	if err != nil {
		return Variant{}, err
	}

	if err := usecase.variantService.ValidateVariantForSaleType(product.SaleType, &variant); err != nil {
		return Variant{}, err
	}

	if variant.TagIds == nil {
		created, err := usecase.variantRepoPort.CreateVariant(ctx, variant)
		if err != nil {
			return Variant{}, err
		}

		created.Product = product
		return created, nil
	}

	var created Variant
	err = usecase.variantRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if err := usecase.variantService.ValidateTagIds(ctxWithTx, variant.TagIds); err != nil {
			return err
		}

		createdVariant, err := usecase.variantRepoPort.CreateVariant(ctxWithTx, variant)
		if err != nil {
			return err
		}

		if err := usecase.variantService.ReplaceVariantTags(ctxWithTx, createdVariant.Id, variant.TagIds); err != nil {
			return err
		}

		created, err = usecase.variantRepoPort.GetVariantById(ctxWithTx, createdVariant.Id)
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
	err := usecase.variantRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, err := usecase.variantRepoPort.GetVariantById(ctxWithTx, id)
		if err != nil {
			return err
		}

		existingProduct, err := usecase.productRepoPort.GetProductById(ctxWithTx, existing.ProductId)
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

		updated, err := usecase.variantRepoPort.UpdateVariantById(ctxWithTx, variant, id)
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
	return usecase.variantRepoPort.DeleteVariantById(ctx, id)
}
