package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type CategoryHandler struct {
	usecase domain.CategoryUsecase
}

func NewCategoryHandler(usecase domain.CategoryUsecase) CategoryHandler {
	return CategoryHandler{usecase: usecase}
}

func (handler CategoryHandler) GetCategoryList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categories, err := handler.usecase.GetCategoryList(ctx)
	if err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiCategories := []apiContract.Category{}
	for _, category := range categories {
		apiCategories = append(apiCategories, ToApiCategory(category))
	}

	WriteResponse(w, apiContract.CategoryList200Response{Data: apiCategories})
}

func (handler CategoryHandler) GetCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	category, baseError := handler.usecase.GetCategoryById(ctx, id)
	if baseError != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(baseError.Type), Message: baseError.Message})
		return
	}

	WriteResponse(w, apiContract.CategoryFindById200Response{Data: ToApiCategory(category)})
}

func (handler CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCategory(ctx, ToCategory(categoryRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler CategoryHandler) UpdateCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	categoryRequest, err := GetCategoryRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateCategoryById(ctx, ToCategory(categoryRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler CategoryHandler) DeleteCategoryById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCategoryId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteCategoryById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
