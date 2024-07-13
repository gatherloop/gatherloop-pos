package transactions

import (
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type Handler struct {
	usecase Usecase
}

func NewHandler(usecase Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetTransactionList(w http.ResponseWriter, r *http.Request) {
	transactions, err := handler.usecase.GetTransactionList()
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.TransactionList200Response{Data: transactions})
	w.Write(response)
}

func (handler Handler) GetTransactionById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	transaction, err := handler.usecase.GetTransactionById(id)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.TransactionFindById200Response{Data: transaction})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	var transactionRequest apiContract.TransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&transactionRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateTransaction(transactionRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}

func (handler Handler) UpdateTransactionById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var transactionRequest apiContract.TransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&transactionRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.UpdateTransactionById(transactionRequest, id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) DeleteTransactionById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	if err := handler.usecase.DeleteTransactionById(id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) PayTransaction(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["transactionId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var transactionPayRequest apiContract.TransactionPayRequest
	if err := json.NewDecoder(r.Body).Decode(&transactionPayRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.PayTransaction(transactionPayRequest, id); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.SuccessResponse{Success: true})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}
