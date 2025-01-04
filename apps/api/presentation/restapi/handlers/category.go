package handlers

import (
	"apps/api/domain/category"
	"apps/api/presentation/restapi"
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
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiCategories := []apiContract.Category{}
	for _, category := range categories {
		apiCategories = append(apiCategories, restapi.ToApiCategory(category))
	}

	json.NewEncoder(w).Encode(apiContract.CategoryList200Response{Data: apiCategories})
}

func (handler CategoryHandler) GetCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetCategoryId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	category, err := handler.usecase.GetCategoryById(ctx, id)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.CategoryFindById200Response{Data: restapi.ToApiCategory(category)})
}

func (handler CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categoryRequest, err := restapi.GetCategoryRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCategory(ctx, restapi.ToCategoryRequest(categoryRequest)); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler CategoryHandler) UpdateCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetCategoryId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	categoryRequest, err := restapi.GetCategoryRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateCategoryById(ctx, restapi.ToCategoryRequest(categoryRequest), id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler CategoryHandler) DeleteCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetCategoryId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteCategoryById(ctx, id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
