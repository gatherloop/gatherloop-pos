package categories

import (
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	usecase := NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/categories", handler.GetCategoryList).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", handler.GetCategoryById).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", handler.DeleteCategoryById).Methods(http.MethodDelete)
	router.HandleFunc("/categories/{categoryId}", handler.UpdateCategoryById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/categories", handler.CreateCategory).Methods(http.MethodPost, http.MethodOptions)
}
