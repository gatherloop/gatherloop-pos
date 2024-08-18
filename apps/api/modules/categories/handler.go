package categories

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

func (handler Handler) GetCategoryList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categories, err := handler.usecase.GetCategoryList(ctx)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}
	json.NewEncoder(w).Encode(apiContract.CategoryList200Response{Data: categories})
}

func (handler Handler) GetCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	category, err := handler.usecase.GetCategoryById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.CategoryFindById200Response{Data: category})
}

func (handler Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCategory(ctx, categoryRequest); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateCategoryById(ctx, categoryRequest, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteCategoryById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
