package restapi

import (
	"apps/api/domain/category"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type CategoryHandler struct {
	usecase category.Usecase
}

func NewCategoryHandler(usecase category.Usecase) CategoryHandler {
	return CategoryHandler{usecase: usecase}
}

func (handler CategoryHandler) GetCategoryList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categories, err := handler.usecase.GetCategoryList(ctx)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiCategories := []apiContract.Category{}
	for _, category := range categories {
		apiCategories = append(apiCategories, ToApiCategory(category))
	}

	json.NewEncoder(w).Encode(apiContract.CategoryList200Response{Data: apiCategories})
}

func (handler CategoryHandler) GetCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	category, err := handler.usecase.GetCategoryById(ctx, id)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.CategoryFindById200Response{Data: ToApiCategory(category)})
}

func (handler CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCategory(ctx, ToCategoryRequest(categoryRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler CategoryHandler) UpdateCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateCategoryById(ctx, ToCategoryRequest(categoryRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler CategoryHandler) DeleteCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteCategoryById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
