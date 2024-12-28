package transactions_http

import (
	budgets_postgresql "apps/api/data/postgresql/budgets"
	products_postgresql "apps/api/data/postgresql/products"
	transactions_postgresql "apps/api/data/postgresql/transactions"
	wallets_postgresql "apps/api/data/postgresql/wallets"
	"apps/api/domain/transactions"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := transactions_postgresql.NewRepository(db)
	productRepository := products_postgresql.NewRepository(db)
	walletRepository := wallets_postgresql.NewRepository(db)
	budgetRepository := budgets_postgresql.NewRepository(db)

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
