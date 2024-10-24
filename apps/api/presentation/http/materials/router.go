package materials_http

import (
	materials_mysql "apps/api/data/mysql/materials"
	"apps/api/domain/materials"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := materials_mysql.NewRepository(db)
	usecase := materials.NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/materials", handler.GetMaterialList).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", handler.GetMaterialById).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", handler.DeleteMaterialById).Methods(http.MethodDelete)
	router.HandleFunc("/materials/{materialId}", handler.UpdateMaterialById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/materials", handler.CreateMaterial).Methods(http.MethodPost, http.MethodOptions)
}
