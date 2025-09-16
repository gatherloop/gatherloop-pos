package transactionCategory

import (
	"apps/api/domain/base"
	"context"
)

type Repository interface {
	GetTransactionCategoryList(ctx context.Context) ([]TransactionCategory, *base.Error)
	GetTransactionCategoryById(ctx context.Context, id int64) (TransactionCategory, *base.Error)
	CreateTransactionCategory(ctx context.Context, transaction *TransactionCategory) *base.Error
	UpdateTransactionCategoryById(ctx context.Context, transaction *TransactionCategory, id int64) *base.Error
	DeleteTransactionCategoryById(ctx context.Context, id int64) *base.Error
}
