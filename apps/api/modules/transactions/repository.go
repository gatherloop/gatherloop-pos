package transactions

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

func (repo Repository) GetTransactionList() ([]apiContract.Transaction, error) {
	var transactions []apiContract.Transaction
	result := repo.db.Table("transactions").Where("deleted_at is NULL").Preload("TransactionItems").Preload("Wallet").Find(&transactions)
	return transactions, result.Error
}

func (repo Repository) GetTransactionById(id int64) (apiContract.Transaction, error) {
	var transaction apiContract.Transaction
	result := repo.db.Table("transactions").Where("id = ?", id).Preload("TransactionItems").Preload("Wallet").Preload("TransactionItems.Product").Preload("TransactionItems.Product.Category").Find(&transaction)
	return transaction, result.Error
}

func (repo Repository) CreateTransaction(transaction *apiContract.Transaction) error {
	result := repo.db.Table("transactions").Create(transaction)
	return result.Error
}

func (repo Repository) UpdateTransactionById(transaction *apiContract.Transaction, id int64) error {
	result := repo.db.Table("transactions").Where(apiContract.Transaction{Id: id}).Updates(transaction)
	return result.Error
}

func (repo Repository) DeleteTranscationById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("transactions").Where(apiContract.Transaction{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) DeleteTransactionItems(transactionId int64) error {
	result := repo.db.Table("transaction_items").Where("transaction_id = ?", transactionId).Delete(apiContract.TransactionItem{})
	return result.Error
}

func (repo Repository) CreateTransactionItem(transactionItem *apiContract.TransactionItem) error {
	result := repo.db.Table("transaction_items").Create(transactionItem)
	return result.Error
}

func (repo Repository) PayTransaction(walletId int64, paidAt time.Time, id int64) error {
	result := repo.db.Table("transactions").Where(apiContract.Transaction{Id: id}).Updates(apiContract.Transaction{WalletId: &walletId, PaidAt: &paidAt})
	return result.Error
}
