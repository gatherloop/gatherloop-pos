package wallets

import (
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

func (repo Repository) GetWalletList() ([]apiContract.Wallet, error) {
	var wallets []apiContract.Wallet
	result := repo.db.Table("wallets").Where("deleted_at", nil).Find(&wallets)
	return wallets, result.Error
}

func (repo Repository) GetWalletById(id int64) (apiContract.Wallet, error) {
	var wallet apiContract.Wallet
	result := repo.db.Table("wallets").Where("id = ?", id).Find(&wallet)
	return wallet, result.Error
}

func (repo Repository) CreateWallet(walletRequest apiContract.WalletRequest) error {
	result := repo.db.Table("wallets").Create(walletRequest)
	return result.Error
}

func (repo Repository) UpdateWalletById(walletRequest apiContract.WalletRequest, id int64) error {
	result := repo.db.Table("wallets").Where(apiContract.Wallet{Id: id}).Updates(walletRequest)
	return result.Error
}

func (repo Repository) DeleteWalletById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("wallets").Where(apiContract.Wallet{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) GetWalletTransferList(walletId int64) ([]apiContract.WalletTransfer, error) {
	var walletTransfers []apiContract.WalletTransfer
	result := repo.db.Table("wallet_transfers").Where("deleted_at is NULL AND from_wallet_id = ?", walletId).Find(&walletTransfers)
	return walletTransfers, result.Error
}

func (repo Repository) CreateWalletTransfer(walletTransferRequest apiContract.WalletTransferRequest, fromWalletId int64) error {
	walletTransfer := apiContract.WalletTransfer{
		CreatedAt:    time.Now(),
		Amount:       walletTransferRequest.Amount,
		ToWalletId:   walletTransferRequest.ToWalletId,
		FromWalletId: fromWalletId,
	}
	result := repo.db.Table("wallet_transfers").Create(&walletTransfer)
	return result.Error
}
