package materials_http

import (
	"apps/api/domain/materials"
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

func ToApiMaterial(material materials.Material) apiContract.Material {
	return apiContract.Material{
		Id:        material.Id,
		Name:      material.Name,
		Price:     material.Price,
		Unit:      material.Unit,
		DeletedAt: material.DeletedAt,
		CreatedAt: material.CreatedAt,
	}
}

func ToMaterialRequest(materialRequest apiContract.MaterialRequest) materials.MaterialRequest {
	return materials.MaterialRequest{
		Name:  materialRequest.Name,
		Price: materialRequest.Price,
		Unit:  materialRequest.Unit,
	}
}
