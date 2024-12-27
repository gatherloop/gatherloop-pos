package transactions_http

import (
	"apps/api/domain/transactions"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase transactions.Usecase
}

func NewHandler(usecase transactions.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetTransactionList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := base.GetQuery(r)
	sortBy := base.GetSortBy(r)
	order := base.GetOrder(r)
	paymentStatus := GetPaymentStatus(r)

	skip, err := base.GetSkip(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := base.GetLimit(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	transactions, total, err := handler.usecase.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiTransactions := []apiContract.Transaction{}
	for _, transaction := range transactions {
		apiTransactions = append(apiTransactions, ToApiTransaction(transaction))
	}

	json.NewEncoder(w).Encode(apiContract.TransactionList200Response{Data: apiTransactions, Meta: apiContract.MetaPage{Total: total}})
}

func (handler Handler) GetTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	transaction, err := handler.usecase.GetTransactionById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.TransactionFindById200Response{Data: ToApiTransaction(transaction)})
}

func (handler Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateTransaction(ctx, ToTransactionRequest(transactionRequest)); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateTransactionById(ctx, ToTransactionRequest(transactionRequest), id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTransactionById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) PayTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	transactionPayRequest, err := GetTransactionPayRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.PayTransaction(ctx, ToTransactionPayRequest(transactionPayRequest), id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) GetTransactionStatistics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	groupBy := base.GetGroupBy(r)

	transactionStatistics, err := handler.usecase.GetTransactionStatistics(ctx, groupBy)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiTransactionStatistics := []apiContract.TransactionStatistic{}
	for _, transactionStatistic := range transactionStatistics {
		apiTransactionStatistics = append(apiTransactionStatistics, ToApiTransactionStatistic(transactionStatistic))
	}

	json.NewEncoder(w).Encode(apiContract.TransactionStatistics200Response{Data: apiTransactionStatistics})
}
