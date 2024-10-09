package wallets_http

import (
	"apps/api/domain/wallets"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetWalletId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["walletId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetWalletRequest(r *http.Request) (apiContract.WalletRequest, error) {
	var walletRequest apiContract.WalletRequest
	err := json.NewDecoder(r.Body).Decode(&walletRequest)
	return walletRequest, err
}

func GetWalletTransferRequest(r *http.Request) (apiContract.WalletTransferRequest, error) {
	var walletTransferRequest apiContract.WalletTransferRequest
	err := json.NewDecoder(r.Body).Decode(&walletTransferRequest)
	return walletTransferRequest, err
}

func ToApiWallet(wallet wallets.Wallet) apiContract.Wallet {
	return apiContract.Wallet{
		Id:                    wallet.Id,
		Name:                  wallet.Name,
		Balance:               wallet.Balance,
		PaymentCostPercentage: wallet.PaymentCostPercentage,
		DeletedAt:             wallet.DeletedAt,
		CreatedAt:             wallet.CreatedAt,
	}
}

func ToWalletRequest(walletRequest apiContract.WalletRequest) wallets.WalletRequest {
	return wallets.WalletRequest{
		Name:                  walletRequest.Name,
		Balance:               walletRequest.Balance,
		PaymentCostPercentage: walletRequest.PaymentCostPercentage,
	}
}

func ToApiWalletTransfer(walletTransfer wallets.WalletTransfer) apiContract.WalletTransfer {
	return apiContract.WalletTransfer{
		Id:           walletTransfer.Id,
		CreatedAt:    walletTransfer.CreatedAt,
		Amount:       walletTransfer.Amount,
		FromWalletId: walletTransfer.FromWalletId,
		FromWallet:   apiContract.Wallet(walletTransfer.FromWallet),
		ToWalletId:   walletTransfer.ToWalletId,
		ToWallet:     apiContract.Wallet(walletTransfer.ToWallet),
		DeletedAt:    walletTransfer.DeletedAt,
	}
}

func ToWalletTransferRequest(walletTransferRequest apiContract.WalletTransferRequest) wallets.WalletTransferRequest {
	return wallets.WalletTransferRequest{
		Amount:     walletTransferRequest.Amount,
		ToWalletId: walletTransferRequest.ToWalletId,
	}
}
