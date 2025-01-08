package wallet

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetWalletList(ctx context.Context) ([]Wallet, *base.Error)
	GetWalletById(ctx context.Context, id int64) (Wallet, *base.Error)
	CreateWallet(ctx context.Context, walletRequest WalletRequest) *base.Error
	UpdateWalletById(ctx context.Context, walletRequest WalletRequest, id int64) *base.Error
	DeleteWalletById(ctx context.Context, id int64) *base.Error
	GetWalletTransferList(ctx context.Context, walletId int64, sortBy base.SortBy, order base.Order, skip int, limit int) ([]WalletTransfer, *base.Error)
	CreateWalletTransfer(ctx context.Context, walletTransferRequest WalletTransferRequest, fromWalletId int64) *base.Error
}
