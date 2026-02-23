package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type SupplierHandler struct {
	usecase domain.SupplierUsecase
}

func NewSupplierHandler(usecase domain.SupplierUsecase) SupplierHandler {
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

	WriteResponse(w, apiContract.SupplierListResponse{Data: apiSuppliers, Meta: apiContract.MetaPage{Total: total}})
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

	WriteResponse(w, apiContract.SupplierFindByIdResponse{Data: ToApiSupplier(Supplier)})
}

func (handler SupplierHandler) CreateSupplier(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	supplierRequest, err := GetSupplierRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	supplier, usecaseErr := handler.usecase.CreateSupplier(ctx, ToSupplier(supplierRequest))
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SupplierCreateResponse{Data: ToApiSupplier(supplier)})
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

	supplier, usecaseErr := handler.usecase.UpdateSupplierById(ctx, ToSupplier(supplierRequest), id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SupplierUpdateByIdResponse{Data: ToApiSupplier(supplier)})
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
