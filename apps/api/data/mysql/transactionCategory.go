package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/transactionCategory"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewTransactionCategoryRepository(db *gorm.DB) transactionCategory.Repository {
	return Repository{db: db}
}

func (repo Repository) GetTransactionCategoryList(ctx context.Context) ([]transactionCategory.TransactionCategory, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var transactionCategories []transactionCategory.TransactionCategory
	result := db.Table("transaction_categories").Preload("CheckoutProduct").Where("deleted_at", nil).Find(&transactionCategories)
	return transactionCategories, ToError(result.Error)
}

func (repo Repository) GetTransactionCategoryById(ctx context.Context, id int64) (transactionCategory.TransactionCategory, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var transactionCategory transactionCategory.TransactionCategory
	result := db.Table("transaction_categories").Preload("CheckoutProduct").Where("id = ?", id).First(&transactionCategory)
	return transactionCategory, ToError(result.Error)
}

func (repo Repository) CreateTransactionCategory(ctx context.Context, transactionCategory *transactionCategory.TransactionCategory) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_categories").Create(transactionCategory)
	return ToError(result.Error)
}

func (repo Repository) UpdateTransactionCategoryById(ctx context.Context, transactionCategory *transactionCategory.TransactionCategory, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("transaction_categories").Where("id = ?", id).Updates(transactionCategory)
	return ToError(result.Error)
}

func (repo Repository) DeleteTransactionCategoryById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("transaction_categories").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
