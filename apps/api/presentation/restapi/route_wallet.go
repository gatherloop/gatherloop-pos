package restapi

import (
	"net/http"

	"github.com/gorilla/mux"
)

type WalletRouter struct {
	handler WalletHandler
}

func NewWalletRouter(handler WalletHandler) WalletRouter {
	return WalletRouter{handler: handler}
}

func (walletRouter WalletRouter) AddRouter(router *mux.Router) {
	router.HandleFunc("/wallets", CheckAuth(walletRouter.handler.GetWalletList)).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", CheckAuth(walletRouter.handler.GetWalletById)).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", CheckAuth(walletRouter.handler.DeleteWalletById)).Methods(http.MethodDelete)
	router.HandleFunc("/wallets/{walletId}", CheckAuth(walletRouter.handler.UpdateWalletById)).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/wallets", CheckAuth(walletRouter.handler.CreateWallet)).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/wallets/{walletId}/transfers", CheckAuth(walletRouter.handler.GetWalletTransferList)).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}/transfers", CheckAuth(walletRouter.handler.CreateWalletTransfer)).Methods(http.MethodPost, http.MethodOptions)
}
