package products

import (
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	usecase := NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/products", handler.GetProductList).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", handler.GetProductById).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", handler.DeleteProductById).Methods(http.MethodDelete)
	router.HandleFunc("/products/{productId}", handler.UpdateProductById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/products", handler.CreateProduct).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/products/{productId}/materials", handler.GetProductMaterialList).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}/materials/{productMaterialId}", handler.GetProductMaterialById).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}/materials/{productMaterialId}", handler.DeleteProductMaterialById).Methods(http.MethodDelete)
	router.HandleFunc("/products/{productId}/materials/{productMaterialId}", handler.UpdateProductMaterialById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/products/{productId}/materials", handler.CreateProductMaterial).Methods(http.MethodPost, http.MethodOptions)
}
