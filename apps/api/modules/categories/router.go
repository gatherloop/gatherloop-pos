package categories

import (
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddCategoryRouters(router *mux.Router, db *gorm.DB) {
	categoryRepository := NewCategoryRepository(db)
	categoryUsecase := NewCategoryUsecase(categoryRepository)
	categoryHandler := NewCategoryHandler(categoryUsecase)

	router.HandleFunc("/categories", categoryHandler.GetCategoryList).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", categoryHandler.GetCategoryById).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", categoryHandler.UpdateCategoryById).Methods(http.MethodPut)
	router.HandleFunc("/categories", categoryHandler.CreateCategory).Methods(http.MethodPost, http.MethodOptions)
}
