//go:generate mockgen -source=transaction_repository.go -destination=../data/mock/transaction_repository.go -package=mock

package domain

import (
	"context"
	"time"
)

type TransactionRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetTransactionList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, paymentStatus PaymentStatus, walletId *int, source *TransactionSource) ([]Transaction, *Error)
	GetTransactionListTotal(ctx context.Context, query string, paymentStatus PaymentStatus, walletId *int, source *TransactionSource) (int64, *Error)
	GetTransactionById(ctx context.Context, id int64) (Transaction, *Error)
	CreateTransaction(ctx context.Context, transaction Transaction) (Transaction, *Error)
	UpdateTransactionById(ctx context.Context, transaction Transaction, id int64) (Transaction, *Error)
	DeleteTransactionById(ctx context.Context, id int64) *Error
	// UndeleteTransactionById reverses DeleteTransactionById's soft delete.
	// It exists for D5's race: a payment that expired locally can still be
	// confirmed paid by a late DOKU notification, and the transaction that
	// expiry soft-deleted has to come back before PayTransaction can touch
	// it again.
	UndeleteTransactionById(ctx context.Context, id int64) *Error
	PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, paidAmount float32, id int64) *Error
	UnpayTransaction(ctx context.Context, id int64) *Error
	GetTransactionStatistics(ctx context.Context, groupBy string, startDate *time.Time, endDate *time.Time) ([]TransactionStatistic, *Error)
}
