package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewWalletRepository(db *gorm.DB) domain.WalletRepository {
	return Repository{db: db}
}

func (repo Repository) GetWalletList(ctx context.Context) ([]domain.Wallet, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var wallets []Wallet
	result := db.Table("wallets").Where("deleted_at", nil).Find(&wallets)
	return ToWalletListDomain(wallets), ToError(result.Error)
}

func (repo Repository) GetWalletById(ctx context.Context, id int64) (domain.Wallet, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var wallet Wallet
	result := db.Table("wallets").Where("id = ?", id).First(&wallet)
	return ToWalletDomain(wallet), ToError(result.Error)
}

func (repo Repository) CreateWallet(ctx context.Context, wallet domain.Wallet) (domain.Wallet, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	walletPayload := ToWalletDB(wallet)
	result := db.Table("wallets").Create(&walletPayload)
	return ToWalletDomain(walletPayload), ToError(result.Error)
}

func (repo Repository) UpdateWalletById(ctx context.Context, wallet domain.Wallet, id int64) (domain.Wallet, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("wallets").Where("id = ?", id).Updates(map[string]any{
		"name":                    wallet.Name,
		"balance":                 wallet.Balance,
		"is_cashless":             wallet.IsCashless,
		"payment_cost_percentage": wallet.PaymentCostPercentage,
	})

	var updatedWallet Wallet
	result = db.Table("wallets").Where("id = ?", id).First(&updatedWallet)
	return ToWalletDomain(updatedWallet), ToError(result.Error)
}

func (repo Repository) DeleteWalletById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("wallets").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) GetWalletTransferList(ctx context.Context, walletId int64, sortBy domain.SortBy, order domain.Order, skip int, limit int) ([]domain.WalletTransfer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var walletTransfers []WalletTransfer

	result := db.Table("wallet_transfers").Preload("FromWallet").Preload("ToWallet").Where("deleted_at is NULL AND from_wallet_id = ?", walletId).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&walletTransfers)

	return ToWalletTransferListDomain(walletTransfers), ToError(result.Error)
}

func (repo Repository) CreateWalletTransfer(ctx context.Context, walletTransfer domain.WalletTransfer, fromWalletId int64) (domain.WalletTransfer, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	walletTransferPayload := ToWalletTransferDB(walletTransfer)

	if result := db.Table("wallet_transfers").Create(&walletTransferPayload); result.Error != nil {
		return domain.WalletTransfer{}, ToError(result.Error)
	}

	var createdWalletTransfer WalletTransfer
	result := db.Table("wallet_transfers").Preload("FromWallet").Preload("ToWallet").Where("id = ?", walletTransferPayload.Id).First(&createdWalletTransfer)
	return ToWalletTransferDomain(createdWalletTransfer), ToError(result.Error)
}
