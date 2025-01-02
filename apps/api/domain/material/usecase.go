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

func (usecase Usecase) GetMaterialList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Material, int64, error) {
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

func (usecase Usecase) GetMaterialById(ctx context.Context, id int64) (Material, error) {
	return usecase.repository.GetMaterialById(ctx, id)
}

func (usecase Usecase) CreateMaterial(ctx context.Context, materialRequest MaterialRequest) error {
	return usecase.repository.CreateMaterial(ctx, materialRequest)
}

func (usecase Usecase) UpdateMaterialById(ctx context.Context, materialRequest MaterialRequest, id int64) error {
	return usecase.repository.UpdateMaterialById(ctx, materialRequest, id)
}

func (usecase Usecase) DeleteMaterialById(ctx context.Context, id int64) error {
	return usecase.repository.DeleteMaterialById(ctx, id)
}