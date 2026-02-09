package restapi

import (
	"apps/api/domain"
	"encoding/json"
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

func ToApiMaterial(material domain.Material) apiContract.Material {
	return apiContract.Material{
		Id:          material.Id,
		Name:        material.Name,
		Price:       material.Price,
		Unit:        material.Unit,
		WeeklyUsage: material.WeeklyUsage,
		DeletedAt:   material.DeletedAt,
		CreatedAt:   material.CreatedAt,
		Description: material.Description,
	}
}

func ToMaterial(materialRequest apiContract.MaterialRequest) domain.Material {
	return domain.Material{
		Name:        materialRequest.Name,
		Price:       materialRequest.Price,
		Unit:        materialRequest.Unit,
		Description: materialRequest.Description,
	}
}
