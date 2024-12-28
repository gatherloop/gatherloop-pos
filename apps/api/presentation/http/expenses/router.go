package expenses_http

import (
	budgets_postgresql "apps/api/data/postgresql/budgets"
	expenses_postgresql "apps/api/data/postgresql/expenses"
	wallets_postgresql "apps/api/data/postgresql/wallets"
	"apps/api/domain/expenses"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := expenses_postgresql.NewRepository(db)
	budgetRepository := budgets_postgresql.NewRepository(db)
	walletRepository := wallets_postgresql.NewRepository(db)

	usecase := expenses.NewUsecase(repository, budgetRepository, walletRepository)
	handler := NewHandler(usecase)

	router.HandleFunc("/expenses", handler.GetExpenseList).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", handler.GetExpenseById).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", handler.UpdateExpenseById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/expenses/{expenseId}", handler.DeleteExpenseById).Methods(http.MethodDelete)
	router.HandleFunc("/expenses", handler.CreateExpense).Methods(http.MethodPost, http.MethodOptions)
}
