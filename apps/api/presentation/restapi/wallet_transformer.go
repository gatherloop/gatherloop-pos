package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetWalletIdQuery(r *http.Request) *int {
	walletId := r.URL.Query().Get("walletId")

	id, err := strconv.Atoi(walletId)
	if err != nil {
		return nil
	}

	return &id
}

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

func ToApiWallet(wallet domain.Wallet) apiContract.Wallet {
	return apiContract.Wallet{
		Id:                    wallet.Id,
		Name:                  wallet.Name,
		Balance:               wallet.Balance,
		PaymentCostPercentage: wallet.PaymentCostPercentage,
		IsCashless:            wallet.IsCashless,
		DeletedAt:             wallet.DeletedAt,
		CreatedAt:             wallet.CreatedAt,
	}
}

func ToWalletRequest(walletRequest apiContract.WalletRequest) domain.Wallet {
	return domain.Wallet{
		Name:                  walletRequest.Name,
		Balance:               walletRequest.Balance,
		PaymentCostPercentage: walletRequest.PaymentCostPercentage,
		IsCashless:            walletRequest.IsCashless,
	}
}

func ToApiWalletTransfer(walletTransfer domain.WalletTransfer) apiContract.WalletTransfer {
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

func ToWalletTransferRequest(walletTransferRequest apiContract.WalletTransferRequest) domain.WalletTransfer {
	return domain.WalletTransfer{
		Amount:     walletTransferRequest.Amount,
		ToWalletId: walletTransferRequest.ToWalletId,
	}
}
