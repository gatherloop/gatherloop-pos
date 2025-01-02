package wallet

import (
	"apps/api/domain/base"
	"context"
	"errors"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetWalletList(ctx context.Context) ([]Wallet, error) {
	return usecase.repository.GetWalletList(ctx)
}

func (usecase Usecase) GetWalletById(ctx context.Context, id int64) (Wallet, error) {
	return usecase.repository.GetWalletById(ctx, id)
}

func (usecase Usecase) CreateWallet(ctx context.Context, walletRequest WalletRequest) error {
	return usecase.repository.CreateWallet(ctx, walletRequest)
}

func (usecase Usecase) UpdateWalletById(ctx context.Context, walletRequest WalletRequest, id int64) error {
	return usecase.repository.UpdateWalletById(ctx, walletRequest, id)
}

func (usecase Usecase) DeleteWalletById(ctx context.Context, id int64) error {
	return usecase.repository.DeleteWalletById(ctx, id)
}

func (usecase Usecase) GetWalletTransferList(ctx context.Context, walletId int64, sortBy base.SortBy, order base.Order, skip int, limit int) ([]WalletTransfer, error) {
	return usecase.repository.GetWalletTransferList(ctx, walletId, sortBy, order, skip, limit)
}

func (usecase Usecase) CreateWalletTransfer(ctx context.Context, walletTransferRequest WalletTransferRequest, fromWalletId int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		fromWallet, err := usecase.repository.GetWalletById(ctxWithTx, fromWalletId)
		if err != nil {
			return err
		}

		if walletTransferRequest.Amount > fromWallet.Balance {
			return errors.New("insufficient balance")
		}

		if err := usecase.repository.UpdateWalletById(ctxWithTx, WalletRequest{Balance: fromWallet.Balance - walletTransferRequest.Amount}, fromWalletId); err != nil {
			return err
		}

		toWallet, err := usecase.repository.GetWalletById(ctxWithTx, walletTransferRequest.ToWalletId)
		if err != nil {
			return err
		}

		if err := usecase.repository.UpdateWalletById(ctxWithTx, WalletRequest{Balance: toWallet.Balance + walletTransferRequest.Amount}, walletTransferRequest.ToWalletId); err != nil {
			return err
		}

		return usecase.repository.CreateWalletTransfer(ctxWithTx, walletTransferRequest, fromWalletId)
	})
}
