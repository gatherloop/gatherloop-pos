package transactions_http

import (
	"apps/api/domain/transactions"
	products_http "apps/api/presentation/http/products"
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

func ToApiTransaction(transaction transactions.Transaction) apiContract.Transaction {
	var apiTransactionItems []apiContract.TransactionItem
	for _, item := range transaction.TransactionItems {
		apiTransactionItems = append(apiTransactionItems, apiContract.TransactionItem{
			Id:            item.Id,
			TransactionId: item.TransactionId,
			ProductId:     item.ProductId,
			Product:       products_http.ToApiProduct(item.Product),
			Amount:        item.Amount,
			Price:         item.Price,
			Subtotal:      item.Subtotal,
		})
	}

	return apiContract.Transaction{
		Id:               transaction.Id,
		Name:             transaction.Name,
		DeletedAt:        transaction.DeletedAt,
		CreatedAt:        transaction.CreatedAt,
		WalletId:         transaction.WalletId,
		Wallet:           (*apiContract.Wallet)(transaction.Wallet),
		Total:            transaction.Total,
		TotalIncome:      transaction.TotalIncome,
		PaidAt:           transaction.PaidAt,
		TransactionItems: apiTransactionItems,
	}
}

func ToTransactionRequest(transactionRequest apiContract.TransactionRequest) transactions.TransactionRequest {
	var transactionItemRequests []transactions.TransactionItemRequest
	for _, item := range transactionRequest.TransactionItems {
		transactionItemRequests = append(transactionItemRequests, transactions.TransactionItemRequest{
			ProductId: item.ProductId,
			Amount:    item.Amount,
		})
	}

	return transactions.TransactionRequest{
		Name:             transactionRequest.Name,
		TransactionItems: transactionItemRequests,
	}
}

func ToTransactionPayRequest(transactionPayRequest apiContract.TransactionPayRequest) transactions.TransactionPayRequest {
	return transactions.TransactionPayRequest{
		WalletId: transactionPayRequest.WalletId,
	}
}

func toApiTransactionStatistic(transactionStatistic transactions.TransactionStatistic) apiContract.TransactionStatistic {
	return apiContract.TransactionStatistic{
		Date:        transactionStatistic.Date,
		Total:       transactionStatistic.Total,
		TotalIncome: transactionStatistic.TotalIncome,
	}
}
