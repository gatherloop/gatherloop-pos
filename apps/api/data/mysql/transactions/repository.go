package transactions_mysql

import (
	base_mysql "apps/api/data/mysql/base"
	"apps/api/domain/base"
	"apps/api/domain/transactions"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) transactions.Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetTransactionList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, paymentStatus transactions.PaymentStatus) ([]transactions.Transaction, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var transactionResults []transactions.Transaction
	result := db.Table("transactions").Where("deleted_at is NULL").Preload("TransactionItems").Preload("Wallet").Order(fmt.Sprintf("%s %s", base_mysql.ToSortByColumn(sortBy), base_mysql.ToOrderColumn(order)))

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	switch paymentStatus {
	case transactions.Paid:
		result = result.Where("paid_at IS NOT NULL")
	case transactions.Unpaid:
		result = result.Where("paid_at IS NULL")
	}

	result = result.Find(&transactionResults)

	return transactionResults, result.Error
}

func (repo Repository) GetTransactionListTotal(ctx context.Context, query string, paymentStatus transactions.PaymentStatus) (int64, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("transactions").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	switch paymentStatus {
	case transactions.Paid:
		result = result.Where("paid_at IS NOT NULL")
	case transactions.Unpaid:
		result = result.Where("paid_at IS NULL")
	}

	result = result.Count(&count)

	return count, result.Error
}

func (repo Repository) GetTransactionById(ctx context.Context, id int64) (transactions.Transaction, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	var transaction transactions.Transaction
	result := db.Table("transactions").Where("id = ?", id).Preload("TransactionItems").Preload("Wallet").Preload("TransactionItems.Product").Preload("TransactionItems.Product.Materials").Preload("TransactionItems.Product.Materials.Material").Preload("TransactionItems.Product.Category").First(&transaction)
	return transaction, result.Error
}

func (repo Repository) CreateTransaction(ctx context.Context, transaction *transactions.Transaction) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Create(transaction)
	return result.Error
}

func (repo Repository) UpdateTransactionById(ctx context.Context, transaction *transactions.Transaction, id int64) error {
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
	result := db.Table("transaction_items").Where("transaction_id = ?", transactionId).Delete(transactions.TransactionItem{})
	return result.Error
}

func (repo Repository) CreateTransactionItems(ctx context.Context, transactionItems []transactions.TransactionItem) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_items").Create(transactionItems)
	return result.Error
}

func (repo Repository) PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(transactions.Transaction{WalletId: &walletId, PaidAt: &paidAt})
	return result.Error
}

func (repo Repository) GetTransactionStatistics(ctx context.Context, groupBy string) ([]transactions.TransactionStatistic, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)

	dateFormat := ""

	if groupBy == "" || groupBy == "date" {
		dateFormat = "%d-%m-%Y"
	} else {
		dateFormat = "%m-%Y"
	}

	var transactionStatistics []transactions.TransactionStatistic
	result := db.Table("transactions").Select(fmt.Sprintf("DATE_FORMAT(created_at, '%s') as date, SUM(total) as total, SUM(total_income) as total_income", dateFormat)).Where("deleted_at is NULL").Group(fmt.Sprintf("DATE_FORMAT(created_at, '%s')", dateFormat)).Find(&transactionStatistics)

	return transactionStatistics, result.Error
}
