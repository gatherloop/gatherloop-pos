package wallets_http

import (
	"apps/api/domain/wallets"
	"apps/api/presentation/http/base"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
)

type Handler struct {
	usecase wallets.Usecase
}

func NewHandler(usecase wallets.Usecase) Handler {
	return Handler{usecase: usecase}
}

func (handler Handler) GetWalletList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	wallets, err := handler.usecase.GetWalletList(ctx)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.SERVER_ERROR, Message: err.Error()})
		return
	}

	var apiWallets []apiContract.Wallet
	for _, wallet := range wallets {
		apiWallets = append(apiWallets, ToApiWallet(wallet))
	}

	json.NewEncoder(w).Encode(apiContract.WalletList200Response{Data: apiWallets})
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

	json.NewEncoder(w).Encode(apiContract.WalletFindById200Response{Data: ToApiWallet(wallet)})
}

func (handler Handler) CreateWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletRequest, err := GetWalletRequest(r)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.VALIDATION_ERROR, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWallet(ctx, ToWalletRequest(walletRequest)); err != nil {
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

	if err := handler.usecase.UpdateWalletById(ctx, ToWalletRequest(walletRequest), id); err != nil {
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

	walletTransfers, err := handler.usecase.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
	if err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	var apiWalletTransfers []apiContract.WalletTransfer
	for _, walletTransfer := range walletTransfers {
		apiWalletTransfers = append(apiWalletTransfers, ToApiWalletTransfer(walletTransfer))
	}

	json.NewEncoder(w).Encode(apiContract.WalletTransferList200Response{Data: apiWalletTransfers})
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

	if err := handler.usecase.CreateWalletTransfer(ctx, ToWalletTransferRequest(walletTransferRequest), walletId); err != nil {
		base.WriteError(w, apiContract.Error{Code: apiContract.DATA_NOT_FOUND, Message: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(apiContract.SuccessResponse{Success: true})
}
