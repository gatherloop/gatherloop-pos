package restapi

import (
	"apps/api/domain/product"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type ProductHandler struct {
	usecase product.Usecase
}

func NewProductHandler(usecase product.Usecase) ProductHandler {
	return ProductHandler{usecase: usecase}
}

func (handler ProductHandler) GetProductList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	products, total, err := handler.usecase.GetProductList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiProducts := []apiContract.Product{}
	for _, product := range products {
		apiProducts = append(apiProducts, ToApiProduct(product))
	}

	json.NewEncoder(w).Encode(apiContract.ProductList200Response{Data: apiProducts, Meta: apiContract.MetaPage{Total: total}})
}

func (handler ProductHandler) GetProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	product, err := handler.usecase.GetProductById(ctx, id)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.ProductFindById200Response{Data: ToApiProduct(product)})
}

func (handler ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	productRequest, err := GetProductRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateProduct(ctx, ToProductRequest(productRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ProductHandler) UpdateProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	productRequest, err := GetProductRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateProductById(ctx, ToProductRequest(productRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ProductHandler) DeleteProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteProductById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
