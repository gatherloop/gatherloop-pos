package domain

import (
	"context"
)

type MaterialUsecase struct {
	repository MaterialRepository
}

func NewMaterialUsecase(repository MaterialRepository) MaterialUsecase {
	return MaterialUsecase{repository: repository}
}

func (usecase MaterialUsecase) GetMaterialList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int) ([]Material, int64, *Error) {
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

func (usecase MaterialUsecase) GetMaterialById(ctx context.Context, id int64) (Material, *Error) {
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

func (usecase MaterialUsecase) CreateMaterial(ctx context.Context, material Material) *Error {
	return usecase.repository.CreateMaterial(ctx, &material)
}

func (usecase MaterialUsecase) UpdateMaterialById(ctx context.Context, material Material, id int64) *Error {
	return usecase.repository.UpdateMaterialById(ctx, &material, id)
}

func (usecase MaterialUsecase) DeleteMaterialById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteMaterialById(ctx, id)
}
