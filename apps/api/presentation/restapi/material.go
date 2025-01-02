package restapi

import (
	"apps/api/domain/material"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type MaterialHandler struct {
	usecase material.Usecase
}

func NewMaterialHandler(usecase material.Usecase) MaterialHandler {
	return MaterialHandler{usecase: usecase}
}

func (handler MaterialHandler) GetMaterialList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	materials, total, err := handler.usecase.GetMaterialList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiMaterials := []apiContract.Material{}
	for _, material := range materials {
		apiMaterials = append(apiMaterials, ToApiMaterial(material))
	}

	json.NewEncoder(w).Encode(apiContract.MaterialList200Response{Data: apiMaterials, Meta: apiContract.MetaPage{Total: total}})
}

func (handler MaterialHandler) GetMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	Material, err := handler.usecase.GetMaterialById(ctx, id)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.MaterialFindById200Response{Data: ToApiMaterial(Material)})
}

func (handler MaterialHandler) CreateMaterial(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	materialRequest, err := GetMaterialRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateMaterial(ctx, ToMaterialRequest(materialRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler MaterialHandler) UpdateMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	materialRequest, err := GetMaterialRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateMaterialById(ctx, ToMaterialRequest(materialRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler MaterialHandler) DeleteMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteMaterialById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
