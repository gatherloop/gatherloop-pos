package wallet

import (
	"apps/api/domain/base"
	"context"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetWalletList(ctx context.Context) ([]Wallet, *base.Error) {
	return usecase.repository.GetWalletList(ctx)
}

func (usecase Usecase) GetWalletById(ctx context.Context, id int64) (Wallet, *base.Error) {
	return usecase.repository.GetWalletById(ctx, id)
}

func (usecase Usecase) CreateWallet(ctx context.Context, wallet Wallet) *base.Error {
	return usecase.repository.CreateWallet(ctx, wallet)
}

func (usecase Usecase) UpdateWalletById(ctx context.Context, wallet Wallet, id int64) *base.Error {
	return usecase.repository.UpdateWalletById(ctx, wallet, id)
}

func (usecase Usecase) DeleteWalletById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.DeleteWalletById(ctx, id)
}

func (usecase Usecase) GetWalletTransferList(ctx context.Context, walletId int64, sortBy base.SortBy, order base.Order, skip int, limit int) ([]WalletTransfer, *base.Error) {
	return usecase.repository.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
}

func (usecase Usecase) CreateWalletTransfer(ctx context.Context, walletTransfer WalletTransfer, fromWalletId int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		fromWallet, err := usecase.repository.GetWalletById(ctxWithTx, fromWalletId)
		if err != nil {
			return err
		}

		if walletTransfer.Amount > fromWallet.Balance {
			return &base.Error{Type: base.BadRequest, Message: "insufficient balance"}
		}

		if err := usecase.repository.UpdateWalletById(ctxWithTx, Wallet{Balance: fromWallet.Balance - walletTransfer.Amount}, fromWalletId); err != nil {
			return err
		}

		toWallet, err := usecase.repository.GetWalletById(ctxWithTx, walletTransfer.ToWalletId)
		if err != nil {
			return err
		}

		if err := usecase.repository.UpdateWalletById(ctxWithTx, Wallet{Balance: toWallet.Balance + walletTransfer.Amount}, walletTransfer.ToWalletId); err != nil {
			return err
		}

		return usecase.repository.CreateWalletTransfer(ctxWithTx, walletTransfer, fromWalletId)
	})
}
