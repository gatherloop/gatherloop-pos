package domain

import (
	"context"
)

type WalletRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetWalletList(ctx context.Context) ([]Wallet, *Error)
	GetWalletById(ctx context.Context, id int64) (Wallet, *Error)
	CreateWallet(ctx context.Context, wallet Wallet) (Wallet, *Error)
	UpdateWalletById(ctx context.Context, wallet Wallet, id int64) (Wallet, *Error)
	DeleteWalletById(ctx context.Context, id int64) *Error
	GetWalletTransferList(ctx context.Context, walletId int64, sortBy SortBy, order Order, skip int, limit int) ([]WalletTransfer, *Error)
	CreateWalletTransfer(ctx context.Context, walletTransfer WalletTransfer, fromWalletId int64) (WalletTransfer, *Error)
}
