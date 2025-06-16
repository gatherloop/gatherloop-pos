package material

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

func (usecase Usecase) GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Material, int64, *base.Error) {
	materials, err := usecase.repository.GetMaterialList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		return []Material{}, 0, err
	}

	total, err := usecase.repository.GetMaterialListTotal(ctx, query)
	if err != nil {
		return []Material{}, 0, err
	}

	return materials, total, nil
}

func (usecase Usecase) GetMaterialById(ctx context.Context, id int64) (Material, *base.Error) {
	return usecase.repository.GetMaterialById(ctx, id)
}

func (usecase Usecase) CreateMaterial(ctx context.Context, material Material) *base.Error {
	return usecase.repository.CreateMaterial(ctx, &material)
}

func (usecase Usecase) UpdateMaterialById(ctx context.Context, material Material, id int64) *base.Error {
	return usecase.repository.UpdateMaterialById(ctx, &material, id)
}

func (usecase Usecase) DeleteMaterialById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteMaterialById(ctx, id)
}
