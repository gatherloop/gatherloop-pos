package budgets

import (
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	usecase := NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/budgets", handler.GetBudgetList).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", handler.GetBudgetById).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", handler.DeleteBudgetById).Methods(http.MethodDelete)
	router.HandleFunc("/budgets/{budgetId}", handler.UpdateBudgetById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/budgets", handler.CreateBudget).Methods(http.MethodPost, http.MethodOptions)
}
