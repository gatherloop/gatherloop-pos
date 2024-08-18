package wallets

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

func (handler Handler) GetWalletList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	wallets, err := handler.usecase.GetWalletList(ctx)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.WalletList200Response{Data: wallets})
}

func (handler Handler) GetWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetWalletId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	wallet, err := handler.usecase.GetWalletById(ctx, id)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.WalletFindById200Response{Data: wallet})
}

func (handler Handler) CreateWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletRequest, err := GetWalletRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWallet(ctx, walletRequest); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) UpdateWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetWalletId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	walletRequest, err := GetWalletRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateWalletById(ctx, walletRequest, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) DeleteWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetWalletId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteWalletById(ctx, id); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler Handler) GetWalletTransferList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletId, err := GetWalletId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	walletTransfers, err := handler.usecase.GetWalletTransferList(ctx, walletId)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.WalletTransferList200Response{Data: walletTransfers})
}

func (handler Handler) CreateWalletTransfer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletId, err := GetWalletId(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	walletTransferRequest, err := GetWalletTransferRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWalletTransfer(ctx, walletTransferRequest, walletId); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
