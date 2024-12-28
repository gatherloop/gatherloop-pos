package products_http

import (
	products_mysql "apps/api/data/mysql/products"
	"apps/api/domain/products"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := products_mysql.NewRepository(db)
	usecase := products.NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/products", handler.GetProductList).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", handler.GetProductById).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", handler.DeleteProductById).Methods(http.MethodDelete)
	router.HandleFunc("/products/{productId}", handler.UpdateProductById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/products", handler.CreateProduct).Methods(http.MethodPost, http.MethodOptions)
}
