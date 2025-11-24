package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type SupplierRouter struct {
	handler SupplierHandler
}

func NewSupplierRouter(handler SupplierHandler) SupplierRouter {
	return SupplierRouter{handler: handler}
}

func (supplierRouter SupplierRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/suppliers", CheckAuth(supplierRouter.handler.GetSupplierList)).Methods(http.MethodGet)
	router.HandleFunc("/suppliers/{supplierId}", CheckAuth(supplierRouter.handler.GetSupplierById)).Methods(http.MethodGet)
	router.HandleFunc("/suppliers/{supplierId}", CheckAuth(supplierRouter.handler.DeleteSupplierById)).Methods(http.MethodDelete)
	router.HandleFunc("/suppliers/{supplierId}", CheckAuth(supplierRouter.handler.UpdateSupplierById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/suppliers", CheckAuth(supplierRouter.handler.CreateSupplier)).Methods(http.MethodPost, http.MethodOptions)
}
