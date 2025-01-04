package handlers

import (
	"apps/api/domain/product"
	"apps/api/presentation/restapi"
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

	query := restapi.GetQuery(r)
	sortBy := restapi.GetSortBy(r)
	order := restapi.GetOrder(r)

	skip, err := restapi.GetSkip(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := restapi.GetLimit(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	products, total, err := handler.usecase.GetProductList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiProducts := []apiContract.Product{}
	for _, product := range products {
		apiProducts = append(apiProducts, restapi.ToApiProduct(product))
	}

	json.NewEncoder(w).Encode(apiContract.ProductList200Response{Data: apiProducts, Meta: apiContract.MetaPage{Total: total}})
}

func (handler ProductHandler) GetProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetProductId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	product, err := handler.usecase.GetProductById(ctx, id)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.ProductFindById200Response{Data: restapi.ToApiProduct(product)})
}

func (handler ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	productRequest, err := restapi.GetProductRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateProduct(ctx, restapi.ToProductRequest(productRequest)); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ProductHandler) UpdateProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetProductId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	productRequest, err := restapi.GetProductRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateProductById(ctx, restapi.ToProductRequest(productRequest), id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler ProductHandler) DeleteProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetProductId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteProductById(ctx, id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
