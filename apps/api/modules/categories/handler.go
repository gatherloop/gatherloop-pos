package categories

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase Usecase
}

func NewCategoryHandler(usecase Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetCategoryList(w http.ResponseWriter, r *http.Request) {
	categories, err := handler.usecase.GetCategoryList()
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.CategoryList200Response{Data: categories})
	w.Write(response)
}

func (handler Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var categoryRequest apiContract.CategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&categoryRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateCategory(categoryRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}
