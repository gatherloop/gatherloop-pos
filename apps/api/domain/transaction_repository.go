package domain

import (
	"context"
	"time"
)

type TransactionRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetTransactionList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, paymentStatus PaymentStatus, walletId *int) ([]Transaction, *Error)
	GetTransactionListTotal(ctx context.Context, query string, paymentStatus PaymentStatus, walletId *int) (int64, *Error)
	GetTransactionById(ctx context.Context, id int64) (Transaction, *Error)
	CreateTransaction(ctx context.Context, transaction *Transaction) *Error
	UpdateTransactionById(ctx context.Context, transaction *Transaction, id int64) *Error
	DeleteTransactionById(ctx context.Context, id int64) *Error
	DeleteTransactionItemById(ctx context.Context, id int64) *Error
	DeleteTransactionCouponById(ctx context.Context, id int64) *Error
	CreateTransactionItems(ctx context.Context, transactionItems []TransactionItem) *Error
	CreateTransactionCoupons(ctx context.Context, transactionCoupons []TransactionCoupon) *Error
	PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, paidAmount float32, id int64) *Error
	UnpayTransaction(ctx context.Context, id int64) *Error
	GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, *Error)
}
