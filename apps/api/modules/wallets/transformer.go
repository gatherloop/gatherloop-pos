package wallets

import (
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
