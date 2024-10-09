package products_http

import (
	"apps/api/domain/products"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase products.Usecase
}

func NewHandler(usecase products.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetProductList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := base.GetQuery(r)
	sortBy := base.GetSortBy(r)
	order := base.GetOrder(r)

	skip, err := base.GetSkip(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := base.GetLimit(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	products, total, err := handler.usecase.GetProductList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	var apiProducts []apiContract.Product
	for _, product := range products {
		apiProducts = append(apiProducts, ToApiProduct(product))
	}

	json.NewEncoder(w).Encode(apiContract.ProductList200Response{Data: apiProducts, Meta: apiContract.MetaPage{Total: total}})
}

func (handler Handler) GetProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	product, err := handler.usecase.GetProductById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.ProductFindById200Response{Data: ToApiProduct(product)})
}

func (handler Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	productRequest, err := GetProductRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateProduct(ctx, ToProductRequest(productRequest)); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	productRequest, err := GetProductRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateProductById(ctx, ToProductRequest(productRequest), id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteProductById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
