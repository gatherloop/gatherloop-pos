package transactions

import (
	"apps/api/modules/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase Usecase
}

func NewHandler(usecase Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetTransactionList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := base.GetQuery(r)
	sortBy := base.GetSortBy(r)
	order := base.GetOrder(r)

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

	transactions, err := handler.usecase.GetTransactionList(ctx, query, sortBy, order, skip, limit)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.TransactionList200Response{Data: transactions})
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

	json.NewEncoder(w).Encode(apiContract.TransactionFindById200Response{Data: transaction})
}

func (handler Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateTransaction(ctx, transactionRequest); err != nil {
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

	if err := handler.usecase.UpdateTransactionById(ctx, transactionRequest, id); err != nil {
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

	if err := handler.usecase.PayTransaction(ctx, transactionPayRequest, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
