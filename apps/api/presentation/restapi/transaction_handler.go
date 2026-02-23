package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type TransactionHandler struct {
	usecase domain.TransactionUsecase
}

func NewTransactionHandler(usecase domain.TransactionUsecase) TransactionHandler {
	return TransactionHandler{usecase: usecase}
}

func (handler TransactionHandler) GetTransactionList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)
	paymentStatus := GetPaymentStatus(r)
	walletId := GetWalletIdQuery(r)

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

	transactions, total, usecaseErr := handler.usecase.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus, walletId)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiTransactions := []apiContract.Transaction{}
	for _, transaction := range transactions {
		apiTransactions = append(apiTransactions, ToApiTransaction(transaction))
	}

	WriteResponse(w, apiContract.TransactionListResponse{Data: apiTransactions, Meta: apiContract.MetaPage{Total: total}})
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

	WriteResponse(w, apiContract.TransactionFindByIdResponse{Data: ToApiTransaction(transaction)})
}

func (handler TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	transactionRequest, err := GetTransactionRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	createdTransaction, usecaseErr := handler.usecase.CreateTransaction(ctx, ToTransaction(transactionRequest))

	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TransactionCreateResponse{Data: ToApiTransaction(createdTransaction)})
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

	updatedTransaction, usecaseErr := handler.usecase.UpdateTransactionById(ctx, ToTransaction(transactionRequest), id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TransactionUpdateByIdResponse{Data: ToApiTransaction(updatedTransaction)})
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

	if err := handler.usecase.PayTransaction(ctx, transactionPayRequest.WalletId, transactionPayRequest.PaidAmount, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TransactionHandler) UnpayTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTransactionId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UnpayTransaction(ctx, id); err != nil {
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

	WriteResponse(w, apiContract.TransactionStatisticResponse{Data: apiTransactionStatistics})
}
