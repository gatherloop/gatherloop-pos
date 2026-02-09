package restapi

import (
	"apps/api/domain/supplier"
	apiContract "libs/api-contract"
	"net/http"
)

type SupplierHandler struct {
	usecase supplier.Usecase
}

func NewSupplierHandler(usecase supplier.Usecase) SupplierHandler {
	return SupplierHandler{usecase: usecase}
}

func (handler SupplierHandler) GetSupplierList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	suppliers, total, usecaseErr := handler.usecase.GetSupplierList(ctx, query, sortBy, order, skip, limit)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiSuppliers := []apiContract.Supplier{}
	for _, supplier := range suppliers {
		apiSuppliers = append(apiSuppliers, ToApiSupplier(supplier))
	}

	WriteResponse(w, apiContract.SupplierList200Response{Data: apiSuppliers, Meta: apiContract.MetaPage{Total: total}})
}

func (handler SupplierHandler) GetSupplierById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetSupplierId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	Supplier, usecaseErr := handler.usecase.GetSupplierById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SupplierFindById200Response{Data: ToApiSupplier(Supplier)})
}

func (handler SupplierHandler) CreateSupplier(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	supplierRequest, err := GetSupplierRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateSupplier(ctx, ToSupplier(supplierRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler SupplierHandler) UpdateSupplierById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetSupplierId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	supplierRequest, err := GetSupplierRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateSupplierById(ctx, ToSupplier(supplierRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler SupplierHandler) DeleteSupplierById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetSupplierId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteSupplierById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
