package materials

import (
	"apps/api/modules/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase Usecase
}

func NewHandler(usecase Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetMaterialList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := base.GetQuery(r)
	sortBy := base.GetSortBy(r)
	order := base.GetOrder(r)

	skip, err := base.GetSkip(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := base.GetLimit(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	materials, err := handler.usecase.GetMaterialList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.MaterialList200Response{Data: materials})
}

func (handler Handler) GetMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	Material, err := handler.usecase.GetMaterialById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.MaterialFindById200Response{Data: Material})
}

func (handler Handler) CreateMaterial(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	materialRequest, err := GetMaterialRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateMaterial(ctx, materialRequest); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	materialRequest, err := GetMaterialRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateMaterialById(ctx, materialRequest, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteMaterialById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetMaterialId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteMaterialById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
