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

func (usecase MaterialUsecase) GetMaterialList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, stockCheckStatus *MaterialStockCheckStatus) ([]Material, int64, *Error) {
	materials, err := usecase.repository.GetMaterialList(ctx, query, sortBy, order, skip, limit, stockCheckStatus)
	if err != nil {
		return []Material{}, 0, err
	}

	total, err := usecase.repository.GetMaterialListTotal(ctx, query, stockCheckStatus)
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
	if err := usecase.validateSuppliers(ctx, material.Suppliers); err != nil {
		return Material{}, err
	}

	created, err := usecase.repository.CreateMaterial(ctx, material)
	if err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{created.Id})
	if err != nil {
		return Material{}, err
	}

	created.WeeklyUsage = materialsUsage[created.Id]
	return created, nil
}

func (usecase MaterialUsecase) UpdateMaterialById(ctx context.Context, material Material, id int64) (Material, *Error) {
	if err := usecase.validateSuppliers(ctx, material.Suppliers); err != nil {
		return Material{}, err
	}

	updated, err := usecase.repository.UpdateMaterialById(ctx, material, id)
	if err != nil {
		return Material{}, err
	}

	materialsUsage, err := usecase.repository.GetMaterialsWeeklyUsage(ctx, []int64{id})
	if err != nil {
		return Material{}, err
	}

	updated.WeeklyUsage = materialsUsage[id]
	return updated, nil
}

func (usecase MaterialUsecase) DeleteMaterialById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteMaterialById(ctx, id)
}

func (usecase MaterialUsecase) validateSuppliers(ctx context.Context, suppliers []MaterialSupplier) *Error {
	for _, p := range suppliers {
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
	return nil
}
