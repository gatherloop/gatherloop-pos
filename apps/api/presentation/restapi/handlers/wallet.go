package handlers

import (
	"apps/api/domain/wallet"
	"apps/api/presentation/restapi"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type WalletHandler struct {
	usecase wallet.Usecase
}

func NewWalletHandler(usecase wallet.Usecase) WalletHandler {
	return WalletHandler{usecase: usecase}
}

func (handler WalletHandler) GetWalletList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	wallets, err := handler.usecase.GetWalletList(ctx)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	apiWallets := []apiContract.Wallet{}
	for _, wallet := range wallets {
		apiWallets = append(apiWallets, restapi.ToApiWallet(wallet))
	}

	json.NewEncoder(w).Encode(apiContract.WalletList200Response{Data: apiWallets})
}

func (handler WalletHandler) GetWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetWalletId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	wallet, err := handler.usecase.GetWalletById(ctx, id)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.WalletFindById200Response{Data: restapi.ToApiWallet(wallet)})
}

func (handler WalletHandler) CreateWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletRequest, err := restapi.GetWalletRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWallet(ctx, restapi.ToWalletRequest(walletRequest)); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler WalletHandler) UpdateWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetWalletId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	walletRequest, err := restapi.GetWalletRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateWalletById(ctx, restapi.ToWalletRequest(walletRequest), id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler WalletHandler) DeleteWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := restapi.GetWalletId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteWalletById(ctx, id); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}

func (handler WalletHandler) GetWalletTransferList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletId, err := restapi.GetWalletId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	sortBy := restapi.GetSortBy(r)
	order := restapi.GetOrder(r)

	skip, err := restapi.GetSkip(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	limit, err := restapi.GetLimit(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	walletTransfers, err := handler.usecase.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	apiWalletTransfers := []apiContract.WalletTransfer{}
	for _, walletTransfer := range walletTransfers {
		apiWalletTransfers = append(apiWalletTransfers, restapi.ToApiWalletTransfer(walletTransfer))
	}

	json.NewEncoder(w).Encode(apiContract.WalletTransferList200Response{Data: apiWalletTransfers})
}

func (handler WalletHandler) CreateWalletTransfer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletId, err := restapi.GetWalletId(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	walletTransferRequest, err := restapi.GetWalletTransferRequest(r)
	if err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWalletTransfer(ctx, restapi.ToWalletTransferRequest(walletTransferRequest), walletId); err != nil {
		restapi.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
