package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewTransactionRepository(db *gorm.DB) domain.TransactionRepository {
	return Repository{db: db}
}

func (repo Repository) GetTransactionList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int, paymentStatus domain.PaymentStatus, walletId *int) ([]domain.Transaction, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var transactionResults []domain.Transaction
	result := db.Table("transactions").Where("deleted_at is NULL").Preload("TransactionItems").Preload("TransactionItems.Variant").Preload("TransactionItems.Variant.VariantValues").Preload("TransactionItems.Variant.VariantValues.OptionValue").Preload("TransactionItems.Variant.Product").Preload("TransactionCoupons").Preload("TransactionCoupons.Coupon").Preload("Wallet").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

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
	case domain.Paid:
		result = result.Where("paid_at IS NOT NULL")
	case domain.Unpaid:
		result = result.Where("paid_at IS NULL")
	}

	if walletId != nil {
		result = result.Where("wallet_id = ?", walletId)
	}

	result = result.Find(&transactionResults)

	return transactionResults, ToError(result.Error)
}

func (repo Repository) GetTransactionListTotal(ctx context.Context, query string, paymentStatus domain.PaymentStatus, walletId *int) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("transactions").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	switch paymentStatus {
	case domain.Paid:
		result = result.Where("paid_at IS NOT NULL")
	case domain.Unpaid:
		result = result.Where("paid_at IS NULL")
	}

	if walletId != nil {
		result = result.Where("wallet_id = ?", walletId)
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetTransactionById(ctx context.Context, id int64) (domain.Transaction, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var transaction domain.Transaction
	result := db.Table("transactions").Where("id = ?", id).Preload("TransactionItems").Preload("Wallet").Preload("TransactionItems.Variant").Preload("TransactionItems.Variant.Materials").Preload("TransactionItems.Variant.Materials.Material").Preload("TransactionItems.Variant.VariantValues").Preload("TransactionItems.Variant.VariantValues.OptionValue").Preload("TransactionItems.Variant.Product").Preload("TransactionCoupons").Preload("TransactionCoupons.Coupon").First(&transaction)
	return transaction, ToError(result.Error)
}

func (repo Repository) CreateTransaction(ctx context.Context, transaction *domain.Transaction) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Create(transaction)
	return ToError(result.Error)
}

func (repo Repository) UpdateTransactionById(ctx context.Context, transaction *domain.Transaction, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(transaction)
	return ToError(result.Error)
}

func (repo Repository) DeleteTransactionById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("transactions").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) DeleteTransactionItemById(ctx context.Context, transactionItemId int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_items").Where("id = ?", transactionItemId).Delete(domain.TransactionItem{})
	return ToError(result.Error)
}

func (repo Repository) DeleteTransactionCouponById(ctx context.Context, transactionCouponId int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_coupons").Where("id = ?", transactionCouponId).Delete(domain.TransactionCoupon{})
	return ToError(result.Error)
}

func (repo Repository) CreateTransactionItems(ctx context.Context, transactionItems []domain.TransactionItem) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("transaction_items").Create(transactionItems)
	return ToError(result.Error)
}

func (repo Repository) CreateTransactionCoupons(ctx context.Context, transactionCoupons []domain.TransactionCoupon) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("transaction_coupons").Create(transactionCoupons)
	return ToError(result.Error)
}

func (repo Repository) PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, paidAmount float32, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(domain.Transaction{WalletId: &walletId, PaidAt: &paidAt, PaidAmount: paidAmount})
	return ToError(result.Error)
}

func (repo Repository) UnpayTransaction(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transactions").Where("id = ?", id).Updates(map[string]interface{}{
		"wallet_id":    nil,
		"total_income": 0,
		"paid_at":      nil,
		"paid_amount":  0,
	})
	return ToError(result.Error)
}

func (repo Repository) GetTransactionStatistics(ctx context.Context, groupBy string) ([]domain.TransactionStatistic, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	dateFormat := ""

	if groupBy == "" || groupBy == "date" {
		dateFormat = "%d-%m-%Y"
	} else {
		dateFormat = "%m-%Y"
	}

	var transactionStatistics []domain.TransactionStatistic
	result := db.Table("transactions").Select(fmt.Sprintf("DATE_FORMAT(created_at, '%s') as date, SUM(total) as total, SUM(total_income) as total_income", dateFormat)).Where("deleted_at is NULL").Group(fmt.Sprintf("DATE_FORMAT(created_at, '%s')", dateFormat)).Find(&transactionStatistics)

	return transactionStatistics, ToError(result.Error)
}
