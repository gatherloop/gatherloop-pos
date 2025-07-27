package variant

import (
	"apps/api/domain/base"
	"context"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetVariantList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Variant, int64, *base.Error) {
	variants, err := usecase.repository.GetVariantList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		return []Variant{}, 0, err
	}

	total, err := usecase.repository.GetVariantListTotal(ctx, query)
	if err != nil {
		return []Variant{}, 0, err
	}

	return variants, total, nil
}

func (usecase Usecase) GetVariantById(ctx context.Context, id int64) (Variant, *base.Error) {
	return usecase.repository.GetVariantById(ctx, id)
}

func (usecase Usecase) CreateVariant(ctx context.Context, variant Variant) *base.Error {
	return usecase.repository.CreateVariant(ctx, &variant)
}

func (usecase Usecase) UpdateVariantById(ctx context.Context, variant Variant, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingVariant, err := usecase.repository.GetVariantById(ctxWithTx, id)
		if err != nil {
			return err
		}

		var variantMaterials []VariantMaterial
		for _, variantMaterial := range variant.Materials {
			variantMaterial := VariantMaterial{
				Id:         variantMaterial.Id,
				VariantId:  id,
				MaterialId: variantMaterial.MaterialId,
				Amount:     variantMaterial.Amount,
			}

			variantMaterials = append(variantMaterials, variantMaterial)
		}

		if err := usecase.repository.CreateVariantMaterials(ctxWithTx, variantMaterials); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, variantRequestMaterial := range variantMaterials {
			newIds[variantRequestMaterial.Id] = true
		}

		for _, existingVariantMaterial := range existingVariant.Materials {
			if !newIds[existingVariantMaterial.Id] {
				if err := usecase.repository.DeleteVariantMaterialById(ctxWithTx, existingVariantMaterial.Id); err != nil {
					return err
				}
			}
		}

		variant := Variant{
			Name:        variant.Name,
			ProductId:   variant.ProductId,
			Price:       variant.Price,
			Description: variant.Description,
		}

		return usecase.repository.UpdateVariantById(ctxWithTx, &variant, id)
	})
}

func (usecase Usecase) DeleteVariantById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteVariantById(ctx, id)
}
