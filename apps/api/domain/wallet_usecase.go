package domain

import (
	"context"
)

type WalletUsecase struct {
	walletRepoPort WalletRepoPort
}

func NewWalletUsecase(walletRepoPort WalletRepoPort) WalletUsecase {
	return WalletUsecase{walletRepoPort: walletRepoPort}
}

func (usecase WalletUsecase) GetWalletList(ctx context.Context) ([]Wallet, *Error) {
	return usecase.walletRepoPort.GetWalletList(ctx)
}

func (usecase WalletUsecase) GetWalletById(ctx context.Context, id int64) (Wallet, *Error) {
	return usecase.walletRepoPort.GetWalletById(ctx, id)
}

func (usecase WalletUsecase) CreateWallet(ctx context.Context, wallet Wallet) (Wallet, *Error) {
	return usecase.walletRepoPort.CreateWallet(ctx, wallet)
}

func (usecase WalletUsecase) UpdateWalletById(ctx context.Context, wallet Wallet, id int64) (Wallet, *Error) {
	return usecase.walletRepoPort.UpdateWalletById(ctx, wallet, id)
}

func (usecase WalletUsecase) DeleteWalletById(ctx context.Context, id int64) *Error {
	return usecase.walletRepoPort.DeleteWalletById(ctx, id)
}

func (usecase WalletUsecase) GetWalletTransferList(ctx context.Context, walletId int64, sortBy SortBy, order Order, skip int, limit int) ([]WalletTransfer, *Error) {
	return usecase.walletRepoPort.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
}

func (usecase WalletUsecase) CreateWalletTransfer(ctx context.Context, walletTransfer WalletTransfer, fromWalletId int64) (WalletTransfer, *Error) {
	err := usecase.walletRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		walletTransfer.FromWalletId = fromWalletId

		fromWallet, err := usecase.walletRepoPort.GetWalletById(ctxWithTx, fromWalletId)
		if err != nil {
			return err
		}
		if walletTransfer.Amount > fromWallet.Balance {
			return &Error{Type: BadRequest, Message: "insufficient balance"}
		}

		if _, err = usecase.walletRepoPort.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  fromWallet.Name,
			PaymentCostPercentage: fromWallet.PaymentCostPercentage,
			IsCashless:            fromWallet.IsCashless,
			IsPaymentTarget:       fromWallet.IsPaymentTarget,
			Balance:               fromWallet.Balance - walletTransfer.Amount,
		}, fromWalletId); err != nil {
			return err
		}

		toWallet, err := usecase.walletRepoPort.GetWalletById(ctxWithTx, walletTransfer.ToWalletId)
		if err != nil {
			return err
		}
		if _, err = usecase.walletRepoPort.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  toWallet.Name,
			PaymentCostPercentage: toWallet.PaymentCostPercentage,
			IsCashless:            toWallet.IsCashless,
			IsPaymentTarget:       toWallet.IsPaymentTarget,
			Balance:               toWallet.Balance + walletTransfer.Amount,
		}, walletTransfer.ToWalletId); err != nil {
			return err
		}

		walletTransfer, err = usecase.walletRepoPort.CreateWalletTransfer(ctxWithTx, walletTransfer, fromWalletId)
		return err
	})

	return walletTransfer, err
}
