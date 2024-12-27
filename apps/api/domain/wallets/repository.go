package wallets

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetWalletList(ctx context.Context) ([]Wallet, error)
	GetWalletById(ctx context.Context, id int64) (Wallet, error)
	CreateWallet(ctx context.Context, walletRequest WalletRequest) error
	UpdateWalletById(ctx context.Context, walletRequest WalletRequest, id int64) error
	DeleteWalletById(ctx context.Context, id int64) error
	GetWalletTransferList(ctx context.Context, walletId int64, sortBy base.SortBy, order base.Order, skip int, limit int) ([]WalletTransfer, error)
	CreateWalletTransfer(ctx context.Context, walletTransferRequest WalletTransferRequest, fromWalletId int64) error
}
