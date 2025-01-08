package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/transaction"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewTransactionRepository(db *gorm.DB) transaction.Repository {
	return Repository{db: db}
}

func (repo Repository) GetTransactionList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, paymentStatus transaction.PaymentStatus) ([]transaction.Transaction, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var transactionResults []transaction.Transaction
	result := db.Table("transactions").Where("deleted_at is NULL").Preload("TransactionItems").Preload("Wallet").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

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
	case transaction.Paid:
		result = result.Where("paid_at IS NOT NULL")
	case transaction.Unpaid:
		result = result.Where("paid_at IS NULL")
	}

	result = result.Find(&transactionResults)

	return transactionResults, ToError(result.Error)
}

func (repo Repository) GetTransactionListTotal(ctx context.Context, query string, paymentStatus transaction.PaymentStatus) (int64, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("transactions").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	switch paymentStatus {
	case transaction.Paid:
		result = result.Where("paid_at IS NOT NULL")
	case transaction.Unpaid:
		result = result.Where("paid_at IS NULL")
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetTransactionById(ctx context.Context, id int64) (transaction.Transaction, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var transaction transaction.Transaction
	result := db.Table("transactions").Where("id = ?", id).Preload("TransactionItems").Preload("Wallet").Preload("TransactionItems.Product").Preload("TransactionItems.Product.Materials").Preload("TransactionItems.Product.Materials.Material").Preload("TransactionItems.Product.Category").First(&transaction)
	return transaction, ToError(result.Error)
}

func (repo Repository) CreateTransaction(ctx context.Context, transaction *transaction.Transaction) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Create(transaction)
	return ToError(result.Error)
}

func (repo Repository) UpdateTransactionById(ctx context.Context, transaction *transaction.Transaction, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(transaction)
	return ToError(result.Error)
}

func (repo Repository) DeleteTranscationById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("transactions").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) DeleteTransactionItems(ctx context.Context, transactionId int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_items").Where("transaction_id = ?", transactionId).Delete(transaction.TransactionItem{})
	return ToError(result.Error)
}

func (repo Repository) CreateTransactionItems(ctx context.Context, transactionItems []transaction.TransactionItem) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_items").Create(transactionItems)
	return ToError(result.Error)
}

func (repo Repository) PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(transaction.Transaction{WalletId: &walletId, PaidAt: &paidAt})
	return ToError(result.Error)
}

func (repo Repository) GetTransactionStatistics(ctx context.Context, groupBy string) ([]transaction.TransactionStatistic, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	dateFormat := ""

	if groupBy == "" || groupBy == "date" {
		dateFormat = "%d-%m-%Y"
	} else {
		dateFormat = "%m-%Y"
	}

	var transactionStatistics []transaction.TransactionStatistic
	result := db.Table("transactions").Select(fmt.Sprintf("DATE_FORMAT(created_at, '%s') as date, SUM(total) as total, SUM(total_income) as total_income", dateFormat)).Where("deleted_at is NULL").Group(fmt.Sprintf("DATE_FORMAT(created_at, '%s')", dateFormat)).Find(&transactionStatistics)

	return transactionStatistics, ToError(result.Error)
}
