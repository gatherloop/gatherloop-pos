package expenses

import (
	"apps/api/modules/budgets"
	"apps/api/modules/wallets"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	budgetRepository := budgets.NewRepository(db)
	walletRepository := wallets.NewRepository(db)

	usecase := NewUsecase(repository, budgetRepository, walletRepository)
	handler := NewHandler(usecase)

	router.HandleFunc("/expenses", handler.GetExpenseList).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", handler.GetExpenseById).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", handler.UpdateExpenseById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/expenses/{expenseId}", handler.DeleteExpenseById).Methods(http.MethodDelete)
	router.HandleFunc("/expenses", handler.CreateExpense).Methods(http.MethodPost, http.MethodOptions)
}
