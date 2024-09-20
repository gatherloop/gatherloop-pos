package transactions

import (
	"apps/api/modules/budgets"
	"apps/api/modules/products"
	"apps/api/modules/wallets"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	productRepository := products.NewRepository(db)
	walletRepository := wallets.NewRepository(db)
	budgetRepository := budgets.NewRepository(db)

	usecase := NewUsecase(repository, productRepository, walletRepository, budgetRepository)
	handler := NewHandler(usecase)

	router.HandleFunc("/transactions", handler.GetTransactionList).Methods(http.MethodGet)
	router.HandleFunc("/transactions/statistics", handler.GetTransactionStatistics).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", handler.GetTransactionById).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", handler.UpdateTransactionById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}", handler.DeleteTransactionById).Methods(http.MethodDelete)
	router.HandleFunc("/transactions/{transactionId}/pay", handler.PayTransaction).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions", handler.CreateTransaction).Methods(http.MethodPost, http.MethodOptions)
}
