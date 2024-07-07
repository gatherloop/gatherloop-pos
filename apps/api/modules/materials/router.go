package materials

import (
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	usecase := NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/materials", handler.GetMaterialList).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", handler.GetMaterialById).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", handler.DeleteMaterialById).Methods(http.MethodDelete)
	router.HandleFunc("/materials/{materialId}", handler.UpdateMaterialById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/materials", handler.CreateMaterial).Methods(http.MethodPost, http.MethodOptions)
}
