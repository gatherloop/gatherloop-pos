package domain

import (
	"context"
)

type WalletUsecase struct {
	repository WalletRepository
}

func NewWalletUsecase(repository WalletRepository) WalletUsecase {
	return WalletUsecase{repository: repository}
}

func (usecase WalletUsecase) GetWalletList(ctx context.Context) ([]Wallet, *Error) {
	return usecase.repository.GetWalletList(ctx)
}

func (usecase WalletUsecase) GetWalletById(ctx context.Context, id int64) (Wallet, *Error) {
	return usecase.repository.GetWalletById(ctx, id)
}

func (usecase WalletUsecase) CreateWallet(ctx context.Context, wallet Wallet) (Wallet, *Error) {
	return usecase.repository.CreateWallet(ctx, wallet)
}

func (usecase WalletUsecase) UpdateWalletById(ctx context.Context, wallet Wallet, id int64) (Wallet, *Error) {
	return usecase.repository.UpdateWalletById(ctx, wallet, id)
}

func (usecase WalletUsecase) DeleteWalletById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteWalletById(ctx, id)
}

func (usecase WalletUsecase) GetWalletTransferList(ctx context.Context, walletId int64, sortBy SortBy, order Order, skip int, limit int) ([]WalletTransfer, *Error) {
	return usecase.repository.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
}

func (usecase WalletUsecase) CreateWalletTransfer(ctx context.Context, walletTransfer WalletTransfer, fromWalletId int64) (WalletTransfer, *Error) {
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		walletTransfer.FromWalletId = fromWalletId

		// Check if fromWallet has sufficient balance
		fromWallet, err := usecase.repository.GetWalletById(ctxWithTx, fromWalletId)
		if err != nil {
			return err
		}
		if walletTransfer.Amount > fromWallet.Balance {
			return &Error{Type: BadRequest, Message: "insufficient balance"}
		}

		// Update fromWallet balance
		if _, err = usecase.repository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  fromWallet.Name,
			PaymentCostPercentage: fromWallet.PaymentCostPercentage,
			IsCashless:            fromWallet.IsCashless,
			Balance:               fromWallet.Balance - walletTransfer.Amount,
		}, fromWalletId); err != nil {
			return err
		}

		// Update toWallet balance
		toWallet, err := usecase.repository.GetWalletById(ctxWithTx, walletTransfer.ToWalletId)
		if err != nil {
			return err
		}
		if _, err = usecase.repository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  toWallet.Name,
			PaymentCostPercentage: toWallet.PaymentCostPercentage,
			IsCashless:            toWallet.IsCashless,
			Balance:               toWallet.Balance + walletTransfer.Amount,
		}, walletTransfer.ToWalletId); err != nil {
			return err
		}

		// Create wallet transfer record
		walletTransfer, err = usecase.repository.CreateWalletTransfer(ctxWithTx, walletTransfer, fromWalletId)
		return err
	})

	return walletTransfer, err
}
