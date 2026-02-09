package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetSupplierId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["supplierId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetSupplierRequest(r *http.Request) (apiContract.SupplierRequest, error) {
	var supplierRequest apiContract.SupplierRequest
	err := json.NewDecoder(r.Body).Decode(&supplierRequest)
	return supplierRequest, err
}

func ToApiSupplier(supplier domain.Supplier) apiContract.Supplier {
	return apiContract.Supplier{
		Id:        supplier.Id,
		Name:      supplier.Name,
		Phone:     supplier.Phone,
		Address:   supplier.Address,
		MapsLink:  supplier.MapsLink,
		DeletedAt: supplier.DeletedAt,
		CreatedAt: supplier.CreatedAt,
	}
}

func ToSupplier(supplierRequest apiContract.SupplierRequest) domain.Supplier {
	return domain.Supplier{
		Name:     supplierRequest.Name,
		Phone:    supplierRequest.Phone,
		Address:  supplierRequest.Address,
		MapsLink: supplierRequest.MapsLink,
	}
}
