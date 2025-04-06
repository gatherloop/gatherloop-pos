package restapi

import (
	"apps/api/domain/transaction"
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
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transactions, total, usecaseErr := handler.usecase.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiTransactions := []apiContract.Transaction{}
	for _, transaction := range transactions {
		apiTransactions = append(apiTransactions, ToApiTransaction(transaction))
	}

	WriteResponse(w, apiContract.TransactionList200Response{Data: apiTransactions, Meta: apiContract.MetaPage{Total: total}})
}

func (handler TransactionHandler) GetTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transaction, usecaseErr := handler.usecase.GetTransactionById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TransactionFindById200Response{Data: ToApiTransaction(transaction)})
}

func (handler TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	id, usecaseErr := handler.usecase.CreateTransaction(ctx, ToTransaction(transactionRequest))

	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TransactionCreate200Response{Success: true, Data: apiContract.TransactionCreate200ResponseData{Id: id}})
}

func (handler TransactionHandler) UpdateTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateTransactionById(ctx, ToTransaction(transactionRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) DeleteTransactionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTransactionById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) PayTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	transactionPayRequest, err := GetTransactionPayRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.PayTransaction(ctx, transactionPayRequest.WalletId, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) GetTransactionStatistics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	groupBy := GetGroupBy(r)

	transactionStatistics, err := handler.usecase.GetTransactionStatistics(ctx, groupBy)
	if err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiTransactionStatistics := []apiContract.TransactionStatistic{}
	for _, transactionStatistic := range transactionStatistics {
		apiTransactionStatistics = append(apiTransactionStatistics, ToApiTransactionStatistic(transactionStatistic))
	}

	WriteResponse(w, apiContract.TransactionStatistics200Response{Data: apiTransactionStatistics})
}
