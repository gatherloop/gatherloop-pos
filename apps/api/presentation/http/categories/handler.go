package categories_http

import (
	"apps/api/domain/categories"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase categories.Usecase
}

func NewHandler(usecase categories.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetCategoryList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categories, err := handler.usecase.GetCategoryList(ctx)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	var apiCategories []apiContract.Category
	for _, category := range categories {
		apiCategories = append(apiCategories, ToApiCategory(category))
	}

	json.NewEncoder(w).Encode(apiContract.CategoryList200Response{Data: apiCategories})
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

	json.NewEncoder(w).Encode(apiContract.CategoryFindById200Response{Data: ToApiCategory(category)})
}

func (handler Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCategory(ctx, ToCategoryRequest(categoryRequest)); err != nil {
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

	if err := handler.usecase.UpdateCategoryById(ctx, ToCategoryRequest(categoryRequest), id); err != nil {
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
