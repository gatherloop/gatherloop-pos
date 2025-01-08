package restapi

import (
	"apps/api/domain/material"
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
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	materials, total, usecaseErr := handler.usecase.GetMaterialList(ctx, query, sortBy, order, skip, limit)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiMaterials := []apiContract.Material{}
	for _, material := range materials {
		apiMaterials = append(apiMaterials, ToApiMaterial(material))
	}

	WriteResponse(w, apiContract.MaterialList200Response{Data: apiMaterials, Meta: apiContract.MetaPage{Total: total}})
}

func (handler MaterialHandler) GetMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	Material, usecaseErr := handler.usecase.GetMaterialById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.MaterialFindById200Response{Data: ToApiMaterial(Material)})
}

func (handler MaterialHandler) CreateMaterial(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	materialRequest, err := GetMaterialRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateMaterial(ctx, ToMaterialRequest(materialRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler MaterialHandler) UpdateMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	materialRequest, err := GetMaterialRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateMaterialById(ctx, ToMaterialRequest(materialRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler MaterialHandler) DeleteMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteMaterialById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
