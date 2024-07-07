package products

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type Handler struct {
	usecase Usecase
}

func NewHandler(usecase Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetProductList(w http.ResponseWriter, r *http.Request) {
	products, err := handler.usecase.GetProductList()
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.ProductList200Response{Data: products})
	w.Write(response)
}

func (handler Handler) GetProductById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["productId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	product, err := handler.usecase.GetProductById(id)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.ProductFindById200Response{Data: product})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var productRequest apiContract.ProductRequest
	if err := json.NewDecoder(r.Body).Decode(&productRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateProduct(productRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}

func (handler Handler) UpdateProductById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["productId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var productRequest apiContract.ProductRequest
	if err := json.NewDecoder(r.Body).Decode(&productRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.UpdateProductById(productRequest, id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) DeleteProductById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["productId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	if err := handler.usecase.DeleteProductById(id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}
