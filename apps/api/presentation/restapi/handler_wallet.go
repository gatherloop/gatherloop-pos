package restapi

import (
	"apps/api/domain/wallet"
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
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiWallets := []apiContract.Wallet{}
	for _, wallet := range wallets {
		apiWallets = append(apiWallets, ToApiWallet(wallet))
	}

	WriteResponse(w, apiContract.WalletList200Response{Data: apiWallets})
}

func (handler WalletHandler) GetWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetWalletId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	wallet, usecaseErr := handler.usecase.GetWalletById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.WalletFindById200Response{Data: ToApiWallet(wallet)})
}

func (handler WalletHandler) CreateWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletRequest, err := GetWalletRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWallet(ctx, ToWalletRequest(walletRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler WalletHandler) UpdateWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetWalletId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	walletRequest, err := GetWalletRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateWalletById(ctx, ToWalletRequest(walletRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler WalletHandler) DeleteWalletById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetWalletId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteWalletById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler WalletHandler) GetWalletTransferList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletId, err := GetWalletId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	sortBy := GetSortBy(r)
	order := GetOrder(r)

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

	walletTransfers, usecaseErr := handler.usecase.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiWalletTransfers := []apiContract.WalletTransfer{}
	for _, walletTransfer := range walletTransfers {
		apiWalletTransfers = append(apiWalletTransfers, ToApiWalletTransfer(walletTransfer))
	}

	WriteResponse(w, apiContract.WalletTransferList200Response{Data: apiWalletTransfers})
}

func (handler WalletHandler) CreateWalletTransfer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	walletId, err := GetWalletId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	walletTransferRequest, err := GetWalletTransferRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateWalletTransfer(ctx, ToWalletTransferRequest(walletTransferRequest), walletId); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
