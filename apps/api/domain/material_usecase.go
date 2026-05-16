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

	suppliersByMaterial, err := usecase.repository.GetMaterialSuppliersByMaterialIds(ctx, materialIds)
	if err != nil {
		return []Material{}, 0, err
	}

	for index, material := range materials {
		material.WeeklyUsage = materialWeeklyUsage[material.Id]
		material.Suppliers = suppliersByMaterial[material.Id]
		if material.Suppliers == nil {
			material.Suppliers = []Supplier{}
		}
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

	suppliersByMaterial, err := usecase.repository.GetMaterialSuppliersByMaterialIds(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	material.WeeklyUsage = materialsUsage[id]
	material.Suppliers = suppliersByMaterial[id]
	if material.Suppliers == nil {
		material.Suppliers = []Supplier{}
	}
	return material, nil
}

func (usecase MaterialUsecase) CreateMaterial(ctx context.Context, material Material, supplierIds []int64) (Material, *Error) {
	createdMaterial, err := usecase.repository.CreateMaterial(ctx, material)
	if err != nil {
		return Material{}, err
	}

	if err := usecase.repository.SetMaterialSuppliers(ctx, createdMaterial.Id, supplierIds); err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{createdMaterial.Id})
	if err != nil {
		return Material{}, err
	}

	suppliersByMaterial, err := usecase.repository.GetMaterialSuppliersByMaterialIds(ctx, []int64{createdMaterial.Id})
	if err != nil {
		return Material{}, err
	}

	createdMaterial.WeeklyUsage = materialsUsage[createdMaterial.Id]
	createdMaterial.Suppliers = suppliersByMaterial[createdMaterial.Id]
	if createdMaterial.Suppliers == nil {
		createdMaterial.Suppliers = []Supplier{}
	}
	return createdMaterial, nil
}

func (usecase MaterialUsecase) UpdateMaterialById(ctx context.Context, material Material, id int64, supplierIds []int64) (Material, *Error) {
	updatedMaterial, err := usecase.repository.UpdateMaterialById(ctx, material, id)
	if err != nil {
		return Material{}, err
	}

	if err := usecase.repository.SetMaterialSuppliers(ctx, id, supplierIds); err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	suppliersByMaterial, err := usecase.repository.GetMaterialSuppliersByMaterialIds(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	updatedMaterial.WeeklyUsage = materialsUsage[id]
	updatedMaterial.Suppliers = suppliersByMaterial[id]
	if updatedMaterial.Suppliers == nil {
		updatedMaterial.Suppliers = []Supplier{}
	}
	return updatedMaterial, nil
}

func (usecase MaterialUsecase) DeleteMaterialById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteMaterialById(ctx, id)
}
