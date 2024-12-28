package transactions_http

import (
	budgets_mysql "apps/api/data/mysql/budgets"
	products_mysql "apps/api/data/mysql/products"
	transactions_mysql "apps/api/data/mysql/transactions"
	wallets_mysql "apps/api/data/mysql/wallets"
	"apps/api/domain/transactions"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := transactions_mysql.NewRepository(db)
	productRepository := products_mysql.NewRepository(db)
	walletRepository := wallets_mysql.NewRepository(db)
	budgetRepository := budgets_mysql.NewRepository(db)

	usecase := transactions.NewUsecase(repository, productRepository, walletRepository, budgetRepository)
	handler := NewHandler(usecase)

	router.HandleFunc("/transactions", handler.GetTransactionList).Methods(http.MethodGet)
	router.HandleFunc("/transactions/statistics", handler.GetTransactionStatistics).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", handler.GetTransactionById).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", handler.UpdateTransactionById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}", handler.DeleteTransactionById).Methods(http.MethodDelete)
	router.HandleFunc("/transactions/{transactionId}/pay", handler.PayTransaction).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions", handler.CreateTransaction).Methods(http.MethodPost, http.MethodOptions)
}
