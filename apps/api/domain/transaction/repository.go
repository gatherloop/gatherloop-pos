package transaction

import (
	"apps/api/domain/base"
	"context"
	"time"
)

type Repository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error
	GetTransactionList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, paymentStatus PaymentStatus, walletId *int) ([]Transaction, *base.Error)
	GetTransactionListTotal(ctx context.Context, query string, paymentStatus PaymentStatus, walletId *int) (int64, *base.Error)
	GetTransactionById(ctx context.Context, id int64) (Transaction, *base.Error)
	CreateTransaction(ctx context.Context, transaction *Transaction) *base.Error
	UpdateTransactionById(ctx context.Context, transaction *Transaction, id int64) *base.Error
	DeleteTranscationById(ctx context.Context, id int64) *base.Error
	DeleteTransactionItemById(ctx context.Context, id int64) *base.Error
	DeleteTransactionCouponById(ctx context.Context, id int64) *base.Error
	CreateTransactionItems(ctx context.Context, transactionItems []TransactionItem) *base.Error
	CreateTransactionCoupons(ctx context.Context, transactionCoupons []TransactionCoupon) *base.Error
	PayTransaction(ctx context.Context, walletId int64, paidAt time.Time, paidAmount float32, id int64) *base.Error
	UnpayTransaction(ctx context.Context, id int64) *base.Error
	GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, *base.Error)
}
