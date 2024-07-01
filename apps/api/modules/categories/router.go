package categories

import (
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddCategoryRouters(router *mux.Router, db *gorm.DB) {
	categoryRepository := NewCategoryRepository(db)
	categoryUsecase := NewCategoryUsecase(categoryRepository)
	categoryHandler := NewCategoryHandler(categoryUsecase)

	router.HandleFunc("/categories", categoryHandler.GetCategoryList).Methods("GET")
	router.HandleFunc("/categories/{categoryId}", categoryHandler.GetCategoryById).Methods("GET")
	router.HandleFunc("/categories/{categoryId}", categoryHandler.UpdateCategoryById).Methods("PUT")
	router.HandleFunc("/categories", categoryHandler.CreateCategory).Methods("POST")
}
