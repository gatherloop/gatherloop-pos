package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetVariantId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["variantId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetVariantRequest(r *http.Request) (apiContract.VariantRequest, error) {
	var variantRequest apiContract.VariantRequest
	err := json.NewDecoder(r.Body).Decode(&variantRequest)
	return variantRequest, err
}

func GetVariantMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["variantMaterialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetVariantMaterialRequest(r *http.Request) (apiContract.VariantMaterialRequest, error) {
	var variantMaterialRequest apiContract.VariantMaterialRequest
	err := json.NewDecoder(r.Body).Decode(&variantMaterialRequest)
	return variantMaterialRequest, err
}

func ToApiVariantMaterial(variantMaterial domain.VariantMaterial) apiContract.VariantMaterial {
	return apiContract.VariantMaterial{
		Id:         variantMaterial.Id,
		VariantId:  variantMaterial.VariantId,
		MaterialId: variantMaterial.MaterialId,
		Amount:     variantMaterial.Amount,
		DeletedAt:  variantMaterial.DeletedAt,
		CreatedAt:  variantMaterial.CreatedAt,
		Material: apiContract.Material{
			Id:          variantMaterial.Material.Id,
			Name:        variantMaterial.Material.Name,
			Description: variantMaterial.Material.Description,
			Price:       variantMaterial.Material.Price,
			Unit:        variantMaterial.Material.Unit,
			WeeklyUsage: variantMaterial.Material.WeeklyUsage,
			CreatedAt:   variantMaterial.CreatedAt,
			DeletedAt:   variantMaterial.DeletedAt,
		},
	}
}

func ToApiVariant(variant domain.Variant) apiContract.Variant {
	apiMaterials := []apiContract.VariantMaterial{}
	for _, variantMaterial := range variant.Materials {
		apiMaterials = append(apiMaterials, ToApiVariantMaterial(variantMaterial))
	}

	apiVariantValues := []apiContract.VariantValue{}
	for _, variantValue := range variant.VariantValues {
		apiVariantValues = append(apiVariantValues, apiContract.VariantValue{
			Id:            variantValue.Id,
			VariantId:     variantValue.VariantId,
			OptionValueId: variantValue.OptionValueId,
			OptionValue: apiContract.OptionValue{
				Id:   variantValue.OptionValue.Id,
				Name: variantValue.OptionValue.Name,
			},
		})
	}

	return apiContract.Variant{
		Id:          variant.Id,
		Name:        variant.Name,
		Price:       variant.Price,
		ProductId:   variant.ProductId,
		Product:     ToApiProduct(variant.Product),
		Materials:   apiMaterials,
		DeletedAt:   variant.DeletedAt,
		CreatedAt:   variant.CreatedAt,
		Description: variant.Description,
		Values:      apiVariantValues,
	}
}

func ToVariant(variantRequest apiContract.VariantRequest) domain.Variant {
	variantMaterials := []domain.VariantMaterial{}
	for _, variantMaterial := range variantRequest.Materials {
		var id int64
		if variantMaterial.Id != nil {
			id = *variantMaterial.Id
		}
		variantMaterials = append(variantMaterials, domain.VariantMaterial{
			Id:         id,
			MaterialId: variantMaterial.MaterialId,
			Amount:     variantMaterial.Amount,
		})
	}

	variantValues := []domain.VariantValue{}
	for _, variantValue := range variantRequest.Values {
		var id int64
		if variantValue.Id != nil {
			id = *variantValue.Id
		}
		variantValues = append(variantValues, domain.VariantValue{
			Id:            id,
			OptionValueId: variantValue.OptionValueId,
		})
	}

	return domain.Variant{
		Name:          variantRequest.Name,
		Price:         variantRequest.Price,
		ProductId:     variantRequest.ProductId,
		Materials:     variantMaterials,
		Description:   variantRequest.Description,
		VariantValues: variantValues,
	}
}
