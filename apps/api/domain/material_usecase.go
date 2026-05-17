package domain

import (
	"apps/api/utils"
	"context"
)

type MaterialUsecase struct {
	repository         MaterialRepository
	supplierRepository SupplierRepository
}

func NewMaterialUsecase(repository MaterialRepository, supplierRepository SupplierRepository) MaterialUsecase {
	return MaterialUsecase{repository: repository, supplierRepository: supplierRepository}
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

func (usecase MaterialUsecase) CreateMaterial(ctx context.Context, material Material) (Material, *Error) {
	createdMaterial, err := usecase.repository.CreateMaterial(ctx, material)
	if err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{createdMaterial.Id})
	if err != nil {
		return Material{}, err
	}

	createdMaterial.WeeklyUsage = materialsUsage[createdMaterial.Id]
	return createdMaterial, nil
}

func (usecase MaterialUsecase) UpdateMaterialById(ctx context.Context, material Material, id int64) (Material, *Error) {
	updatedMaterial, err := usecase.repository.UpdateMaterialById(ctx, material, id)
	if err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	updatedMaterial.WeeklyUsage = materialsUsage[id]
	return updatedMaterial, nil
}

func (usecase MaterialUsecase) DeleteMaterialById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteMaterialById(ctx, id)
}

func (usecase MaterialUsecase) SetMaterialSuppliers(ctx context.Context, materialId int64, payload []MaterialSupplier) *Error {
	for _, p := range payload {
		switch p.PurchaseType {
		case PurchaseTypeOnline:
			if !utils.IsValidHttpUrl(p.PurchaseUrl) {
				return &Error{Type: BadRequest, Message: "purchase_url must be a valid http(s):// URL for online purchase type"}
			}
		case PurchaseTypeOffline, PurchaseTypeDelivery:
			if p.PurchaseUrl != "" {
				return &Error{Type: BadRequest, Message: "purchase_url must be empty for offline and delivery purchase types"}
			}
		default:
			return &Error{Type: BadRequest, Message: "invalid purchase_type: must be online, offline, or delivery"}
		}

		_, err := usecase.supplierRepository.GetSupplierById(ctx, p.SupplierId)
		if err != nil {
			return &Error{Type: BadRequest, Message: "supplier not found or has been deleted"}
		}
	}

	return usecase.repository.ReplaceSuppliers(ctx, materialId, payload)
}

