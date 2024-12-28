package wallets_http

import (
	wallets_postgresql "apps/api/data/postgresql/wallets"
	"apps/api/domain/wallets"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	repository := wallets_postgresql.NewRepository(db)
	usecase := wallets.NewUsecase(repository)
	handler := NewHandler(usecase)

	router.HandleFunc("/wallets", handler.GetWalletList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", handler.GetWalletById).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", handler.DeleteWalletById).Methods(http.MethodDelete)
	router.HandleFunc("/wallets/{walletId}", handler.UpdateWalletById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/wallets", handler.CreateWallet).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/wallets/{walletId}/transfers", handler.GetWalletTransferList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}/transfers", handler.CreateWalletTransfer).Methods(http.MethodPost, http.MethodOptions)
}
