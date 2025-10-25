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

	materialIds := []int64{}
	for _, material := range materials {
		materialIds = append(materialIds, material.Id)
	}
	materialWeeklyUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, materialIds)
	if err != nil {
		return []Material{}, 0, err
	}
	for index, material := range materials {
		material.WeeklyUsage = materialWeeklyUsage[material.Id]
		materials[index] = material
	}

	return materials, total, nil
}

func (usecase Usecase) GetMaterialById(ctx context.Context, id int64) (Material, *base.Error) {
	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	material, err := usecase.repository.GetMaterialById(ctx, id)
	if err != nil {
		return Material{}, err
	}

	material.WeeklyUsage = materialsUsage[id]
	return material, nil
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
