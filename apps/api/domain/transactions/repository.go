package transactions

import (
	"apps/api/domain/base"
	"context"
	"time"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error
	GetTransactionList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, paymentStatus PaymentStatus) ([]Transaction, error)
	GetTransactionListTotal(ctx context.Context, query string, paymentStatus PaymentStatus) (int64, error)
	GetTransactionById(ctx context.Context, id int64) (Transaction, error)
	CreateTransaction(ctx context.Context, transaction *Transaction) error
	UpdateTransactionById(ctx context.Context, transaction *Transaction, id int64) error
	DeleteTranscationById(ctx context.Context, id int64) error
	DeleteTransactionItems(ctx context.Context, transactionId int64) error
	CreateTransactionItems(ctx context.Context, transactionItems []TransactionItem) error
	PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, id int64) error
	GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, error)
}
