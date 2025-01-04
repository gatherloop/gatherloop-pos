package routers

import (
	"apps/api/presentation/restapi/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

type WalletRouter struct {
	handler handlers.WalletHandler
}

func NewWalletRouter(handler handlers.WalletHandler) WalletRouter {
	return WalletRouter{handler: handler}
}

func (walletRouter WalletRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/wallets", walletRouter.handler.GetWalletList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", walletRouter.handler.GetWalletById).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", walletRouter.handler.DeleteWalletById).Methods(http.MethodDelete)
	router.HandleFunc("/wallets/{walletId}", walletRouter.handler.UpdateWalletById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/wallets", walletRouter.handler.CreateWallet).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/wallets/{walletId}/transfers", walletRouter.handler.GetWalletTransferList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}/transfers", walletRouter.handler.CreateWalletTransfer).Methods(http.MethodPost, http.MethodOptions)
}
