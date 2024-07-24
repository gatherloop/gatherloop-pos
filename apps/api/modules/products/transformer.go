package products

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetProductId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["productId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetProductRequest(r *http.Request) (apiContract.ProductRequest, error) {
	var productRequest apiContract.ProductRequest
	err := json.NewDecoder(r.Body).Decode(&productRequest)
	return productRequest, err
}

func GetProductMaterialId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["productMaterialId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetProductMaterialRequest(r *http.Request) (apiContract.ProductMaterialRequest, error) {
	var productMaterialRequest apiContract.ProductMaterialRequest
	err := json.NewDecoder(r.Body).Decode(&productMaterialRequest)
	return productMaterialRequest, err
}
