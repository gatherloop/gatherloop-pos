package wallets

import (
	"apps/api/utils"
	"context"
	apiContract "libs/api-contract"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetWalletList(ctx context.Context) ([]apiContract.Wallet, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var wallets []apiContract.Wallet
	result := db.Table("wallets").Where("deleted_at", nil).Find(&wallets)
	return wallets, result.Error
}

func (repo Repository) GetWalletById(ctx context.Context, id int64) (apiContract.Wallet, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var wallet apiContract.Wallet
	result := db.Table("wallets").Where("id = ?", id).First(&wallet)
	return wallet, result.Error
}

func (repo Repository) CreateWallet(ctx context.Context, walletRequest apiContract.WalletRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("wallets").Create(walletRequest)
	return result.Error
}

func (repo Repository) UpdateWalletById(ctx context.Context, walletRequest apiContract.WalletRequest, id int64) error {
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

func (repo Repository) GetWalletTransferList(ctx context.Context, walletId int64) ([]apiContract.WalletTransfer, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var walletTransfers []apiContract.WalletTransfer
	result := db.Table("wallet_transfers").Preload("FromWallet").Preload("ToWallet").Where("deleted_at is NULL AND from_wallet_id = ?", walletId).Find(&walletTransfers)
	return walletTransfers, result.Error
}

func (repo Repository) CreateWalletTransfer(ctx context.Context, walletTransferRequest apiContract.WalletTransferRequest, fromWalletId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	walletTransfer := apiContract.WalletTransfer{
		CreatedAt:    time.Now(),
		Amount:       walletTransferRequest.Amount,
		ToWalletId:   walletTransferRequest.ToWalletId,
		FromWalletId: fromWalletId,
	}
	result := db.Table("wallet_transfers").Create(&walletTransfer)
	return result.Error
}
