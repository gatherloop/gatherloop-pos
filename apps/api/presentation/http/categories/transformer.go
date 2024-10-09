package categories_http

import (
	"apps/api/domain/categories"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetCategoryId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["categoryId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCategoryRequest(r *http.Request) (apiContract.CategoryRequest, error) {
	var categoryRequest apiContract.CategoryRequest
	err := json.NewDecoder(r.Body).Decode(&categoryRequest)
	return categoryRequest, err
}

func ToApiCategory(category categories.Category) apiContract.Category {
	return apiContract.Category{
		Id:        category.Id,
		Name:      category.Name,
		DeletedAt: category.DeletedAt,
		CreatedAt: category.CreatedAt,
	}
}

func ToCategoryRequest(categoryRequest apiContract.CategoryRequest) categories.CategoryRequest {
	return categories.CategoryRequest{
		Name: categoryRequest.Name,
	}
}
