package restapi

import (
	"apps/api/domain/transaction"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type TransactionHandler struct {
	usecase transaction.Usecase
}

func NewTransactionHandler(usecase transaction.Usecase) TransactionHandler {
	return TransactionHandler{usecase: usecase}
}

func (handler TransactionHandler) GetTransactionList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)
	paymentStatus := GetPaymentStatus(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	transactions, total, err := handler.usecase.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiTransactions := []apiContract.Transaction{}
	for _, transaction := range transactions {
		apiTransactions = append(apiTransactions, ToApiTransaction(transaction))
	}

	json.NewEncoder(w).Encode(apiContract.TransactionList200Response{Data: apiTransactions, Meta: apiContract.MetaPage{Total: total}})
}

func (handler TransactionHandler) GetTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	transaction, err := handler.usecase.GetTransactionById(ctx, id)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.TransactionFindById200Response{Data: ToApiTransaction(transaction)})
}

func (handler TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateTransaction(ctx, ToTransactionRequest(transactionRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) UpdateTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateTransactionById(ctx, ToTransactionRequest(transactionRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) DeleteTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTransactionById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) PayTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	transactionPayRequest, err := GetTransactionPayRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.PayTransaction(ctx, ToTransactionPayRequest(transactionPayRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) GetTransactionStatistics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	groupBy := GetGroupBy(r)

	transactionStatistics, err := handler.usecase.GetTransactionStatistics(ctx, groupBy)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiTransactionStatistics := []apiContract.TransactionStatistic{}
	for _, transactionStatistic := range transactionStatistics {
		apiTransactionStatistics = append(apiTransactionStatistics, ToApiTransactionStatistic(transactionStatistic))
	}

	json.NewEncoder(w).Encode(apiContract.TransactionStatistics200Response{Data: apiTransactionStatistics})
}
