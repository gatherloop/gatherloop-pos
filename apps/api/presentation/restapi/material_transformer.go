package restapi

import (
	"apps/api/domain"
	"encoding/json"
	"fmt"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["materialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetMaterialRequest(r *http.Request) (apiContract.MaterialRequest, error) {
	var materialRequest apiContract.MaterialRequest
	err := json.NewDecoder(r.Body).Decode(&materialRequest)
	return materialRequest, err
}

func ToApiMaterialSupplier(ms domain.MaterialSupplier) apiContract.MaterialSupplier {
	return apiContract.MaterialSupplier{
		Id:           ms.Id,
		SupplierId:   ms.SupplierId,
		PurchaseType: string(ms.PurchaseType),
		PurchaseUrl:  ms.PurchaseUrl,
		Supplier:     ToApiSupplier(ms.Supplier),
	}
}

func ToApiMaterial(material domain.Material) apiContract.Material {
	suppliers := []apiContract.MaterialSupplier{}
	for _, ms := range material.Suppliers {
		suppliers = append(suppliers, ToApiMaterialSupplier(ms))
	}
	return apiContract.Material{
		Id:                   material.Id,
		Name:                 material.Name,
		Price:                material.Price,
		Unit:                 material.Unit,
		WeeklyUsage:          material.WeeklyUsage,
		DeletedAt:            material.DeletedAt,
		CreatedAt:            material.CreatedAt,
		Description:          material.Description,
		PurchaseUnit:         material.PurchaseUnit,
		PurchaseUnitSize:     material.PurchaseUnitSize,
		MinimumStock:         int32(material.MinimumStock),
		NormalStock:          int32(material.NormalStock),
		Suppliers:            suppliers,
		IsStockCheckRequired: material.IsStockCheckRequired,
	}
}

func ToMaterial(materialRequest apiContract.MaterialRequest) domain.Material {
	suppliers := []domain.MaterialSupplier{}
	for _, s := range materialRequest.Suppliers {
		suppliers = append(suppliers, domain.MaterialSupplier{
			SupplierId:   s.SupplierId,
			PurchaseType: domain.PurchaseType(s.PurchaseType),
			PurchaseUrl:  s.PurchaseUrl,
		})
	}
	return domain.Material{
		Name:                 materialRequest.Name,
		Price:                materialRequest.Price,
		Unit:                 materialRequest.Unit,
		Description:          materialRequest.Description,
		PurchaseUnit:         materialRequest.PurchaseUnit,
		PurchaseUnitSize:     materialRequest.PurchaseUnitSize,
		MinimumStock:         materialRequest.MinimumStock,
		NormalStock:          materialRequest.NormalStock,
		Suppliers:            suppliers,
		IsStockCheckRequired: materialRequest.IsStockCheckRequired,
	}
}

func ValidateMaterialRequest(req apiContract.MaterialRequest) error {
	if req.PurchaseUnitSize <= 0 {
		return fmt.Errorf("purchase_unit_size must be greater than 0")
	}
	if req.MinimumStock < 0 {
		return fmt.Errorf("minimum_stock must be greater than or equal to 0")
	}
	if req.NormalStock < 0 {
		return fmt.Errorf("normal_stock must be greater than or equal to 0")
	}
	return nil
}
