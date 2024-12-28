package expenses_http

import (
	budgets_mysql "apps/api/data/mysql/budgets"
	expenses_mysql "apps/api/data/mysql/expenses"
	wallets_mysql "apps/api/data/mysql/wallets"
	"apps/api/domain/expenses"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := expenses_mysql.NewRepository(db)
	budgetRepository := budgets_mysql.NewRepository(db)
	walletRepository := wallets_mysql.NewRepository(db)

	usecase := expenses.NewUsecase(repository, budgetRepository, walletRepository)
	handler := NewHandler(usecase)

	router.HandleFunc("/expenses", handler.GetExpenseList).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", handler.GetExpenseById).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", handler.UpdateExpenseById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/expenses/{expenseId}", handler.DeleteExpenseById).Methods(http.MethodDelete)
	router.HandleFunc("/expenses", handler.CreateExpense).Methods(http.MethodPost, http.MethodOptions)
}
