package wallets

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

func (handler Handler) GetWalletList(w http.ResponseWriter, r *http.Request) {
	wallets, err := handler.usecase.GetWalletList()
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.WalletList200Response{Data: wallets})
	w.Write(response)
}

func (handler Handler) GetWalletById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["walletId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	wallet, err := handler.usecase.GetWalletById(id)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.WalletFindById200Response{Data: wallet})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) CreateWallet(w http.ResponseWriter, r *http.Request) {
	var walletRequest apiContract.WalletRequest
	if err := json.NewDecoder(r.Body).Decode(&walletRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateWallet(walletRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	response, _ := json.Marshal(apiContract.SuccessResponse{Success: true})
	w.Write(response)
}

func (handler Handler) UpdateWalletById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["walletId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var walletRequest apiContract.WalletRequest
	if err := json.NewDecoder(r.Body).Decode(&walletRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.UpdateWalletById(walletRequest, id); err != nil {
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

func (handler Handler) DeleteWalletById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idParam := vars["walletId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	if err := handler.usecase.DeleteWalletById(id); err != nil {
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

func (handler Handler) GetWalletTransferList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	walletIdParam := vars["walletId"]
	walletId, err := strconv.ParseInt(walletIdParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	walletTransfers, err := handler.usecase.GetWalletTransferList(walletId)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		w.WriteHeader(404)
		w.Write(response)
		return
	}

	response, err := json.Marshal(apiContract.WalletTransferList200Response{Data: walletTransfers})
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	w.Write(response)
}

func (handler Handler) CreateWalletTransfer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	walletIdParam := vars["walletId"]
	walletId, err := strconv.ParseInt(walletIdParam, 10, 32)
	if err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		w.WriteHeader(500)
		w.Write(response)
		return
	}

	var walletTransferRequest apiContract.WalletTransferRequest
	if err := json.NewDecoder(r.Body).Decode(&walletTransferRequest); err != nil {
		response, _ := json.Marshal(apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		w.WriteHeader(403)
		w.Write(response)
		return
	}

	if err := handler.usecase.CreateWalletTransfer(walletTransferRequest, walletId); err != nil {
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
