package domain

import (
	"context"
)

type MaterialUsecase struct {
	materialRepoPort MaterialRepoPort
	materialService  MaterialService
}

func NewMaterialUsecase(
	materialRepoPort MaterialRepoPort,
	materialService MaterialService,
) MaterialUsecase {
	return MaterialUsecase{
		materialRepoPort: materialRepoPort,
		materialService:  materialService,
	}
}

func (usecase MaterialUsecase) GetMaterialList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, stockCheckStatus *MaterialStockCheckStatus) ([]Material, int64, *Error) {
	materials, err := usecase.materialRepoPort.GetMaterialList(ctx, query, sortBy, order, skip, limit, stockCheckStatus)
	if err != nil {
		return []Material{}, 0, err
	}

	total, err := usecase.materialRepoPort.GetMaterialListTotal(ctx, query, stockCheckStatus)
	if err != nil {
		return []Material{}, 0, err
	}

	materialIds := []int64{}
	for _, material := range materials {
		materialIds = append(materialIds, material.Id)
	}
	materialWeeklyUsage, err := usecase.materialRepoPort.GetMaterialsWeeklyUsage(ctx, materialIds)
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
	materialsUsage, err := usecase.materialRepoPort.GetMaterialsWeeklyUsage(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	material, err := usecase.materialRepoPort.GetMaterialById(ctx, id)
	if err != nil {
		return Material{}, err
	}

	material.WeeklyUsage = materialsUsage[id]
	return material, nil
}

func (usecase MaterialUsecase) CreateMaterial(ctx context.Context, material Material) (Material, *Error) {
	if err := usecase.materialService.ValidateSuppliers(ctx, material.Suppliers); err != nil {
		return Material{}, err
	}

	created, err := usecase.materialRepoPort.CreateMaterial(ctx, material)
	if err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.materialRepoPort.GetMaterialsWeeklyUsage(ctx, []int64{created.Id})
	if err != nil {
		return Material{}, err
	}

	created.WeeklyUsage = materialsUsage[created.Id]
	return created, nil
}

func (usecase MaterialUsecase) UpdateMaterialById(ctx context.Context, material Material, id int64) (Material, *Error) {
	if err := usecase.materialService.ValidateSuppliers(ctx, material.Suppliers); err != nil {
		return Material{}, err
	}

	updated, err := usecase.materialRepoPort.UpdateMaterialById(ctx, material, id)
	if err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.materialRepoPort.GetMaterialsWeeklyUsage(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	updated.WeeklyUsage = materialsUsage[id]
	return updated, nil
}

func (usecase MaterialUsecase) DeleteMaterialById(ctx context.Context, id int64) *Error {
	return usecase.materialRepoPort.DeleteMaterialById(ctx, id)
}
