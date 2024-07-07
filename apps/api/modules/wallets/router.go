package wallets

import (
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := NewRepository(db)
	usecase := NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/wallets", handler.GetWalletList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", handler.GetWalletById).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", handler.DeleteWalletById).Methods(http.MethodDelete)
	router.HandleFunc("/wallets/{walletId}", handler.UpdateWalletById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/wallets", handler.CreateWallet).Methods(http.MethodPost, http.MethodOptions)
}
