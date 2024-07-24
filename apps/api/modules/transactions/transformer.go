package transactions

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetTransactionId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetTransactionRequest(r *http.Request) (apiContract.TransactionRequest, error) {
	var transactionRequest apiContract.TransactionRequest
	err := json.NewDecoder(r.Body).Decode(&transactionRequest)
	return transactionRequest, err
}

func GetTransactionPayRequest(r *http.Request) (apiContract.TransactionPayRequest, error) {
	var transactionPayRequest apiContract.TransactionPayRequest
	err := json.NewDecoder(r.Body).Decode(&transactionPayRequest)
	return transactionPayRequest, err
}
