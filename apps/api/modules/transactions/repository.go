package transactions

import (
	"apps/api/utils"
	"context"
	"fmt"
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

func (repo Repository) GetTransactionList(ctx context.Context, query string, sortBy string, order string, skip int, limit int) ([]apiContract.Transaction, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var transactions []apiContract.Transaction
	result := db.Table("transactions").Where("deleted_at is NULL").Preload("TransactionItems").Preload("Wallet")

	if sortBy != "" && order != "" {
		result = result.Order(fmt.Sprintf("%s %s", sortBy, order))
	}

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&transactions)

	return transactions, result.Error
}

func (repo Repository) GetTransactionById(ctx context.Context, id int64) (apiContract.Transaction, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var transaction apiContract.Transaction
	result := db.Table("transactions").Where("id = ?", id).Preload("TransactionItems").Preload("Wallet").Preload("TransactionItems.Product").Preload("TransactionItems.Product.Materials").Preload("TransactionItems.Product.Materials.Material").Preload("TransactionItems.Product.Category").First(&transaction)
	return transaction, result.Error
}

func (repo Repository) CreateTransaction(ctx context.Context, transaction *apiContract.Transaction) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Create(transaction)
	return result.Error
}

func (repo Repository) UpdateTransactionById(ctx context.Context, transaction *apiContract.Transaction, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(transaction)
	return result.Error
}

func (repo Repository) DeleteTranscationById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("transactions").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) DeleteTransactionItems(ctx context.Context, transactionId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_items").Where("transaction_id = ?", transactionId).Delete(apiContract.TransactionItem{})
	return result.Error
}

func (repo Repository) CreateTransactionItems(ctx context.Context, transactionItems []apiContract.TransactionItem) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_items").Create(transactionItems)
	return result.Error
}

func (repo Repository) PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(apiContract.Transaction{WalletId: &walletId, PaidAt: &paidAt})
	return result.Error
}
