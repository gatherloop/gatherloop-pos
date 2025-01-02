package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/wallet"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewWalletRepository(db *gorm.DB) wallet.Repository {
	return Repository{db: db}
}

func (repo Repository) GetWalletList(ctx context.Context) ([]wallet.Wallet, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var wallets []wallet.Wallet
	result := db.Table("wallets").Where("deleted_at", nil).Find(&wallets)
	return wallets, result.Error
}

func (repo Repository) GetWalletById(ctx context.Context, id int64) (wallet.Wallet, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var wallet wallet.Wallet
	result := db.Table("wallets").Where("id = ?", id).First(&wallet)
	return wallet, result.Error
}

func (repo Repository) CreateWallet(ctx context.Context, walletRequest wallet.WalletRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("wallets").Create(walletRequest)
	return result.Error
}

func (repo Repository) UpdateWalletById(ctx context.Context, walletRequest wallet.WalletRequest, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("wallets").Where("id = ?", id).Updates(walletRequest)
	return result.Error
}

func (repo Repository) DeleteWalletById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("wallets").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) GetWalletTransferList(ctx context.Context, walletId int64, sortBy base.SortBy, order base.Order, skip int, limit int) ([]wallet.WalletTransfer, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var walletTransfers []wallet.WalletTransfer

	result := db.Table("wallet_transfers").Preload("FromWallet").Preload("ToWallet").Where("deleted_at is NULL AND from_wallet_id = ?", walletId).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&walletTransfers)

	return walletTransfers, result.Error
}

func (repo Repository) CreateWalletTransfer(ctx context.Context, walletTransferRequest wallet.WalletTransferRequest, fromWalletId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	walletTransfer := wallet.WalletTransfer{
		CreatedAt:    time.Now(),
		Amount:       walletTransferRequest.Amount,
		ToWalletId:   walletTransferRequest.ToWalletId,
		FromWalletId: fromWalletId,
	}
	result := db.Table("wallet_transfers").Create(&walletTransfer)
	return result.Error
}
