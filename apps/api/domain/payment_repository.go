//go:generate mockgen -source=payment_repository.go -destination=../data/mock/payment_repository.go -package=mock

package domain

import (
	"context"
	"time"
)

type PaymentRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetPaymentByPartnerReferenceNo(ctx context.Context, partnerReferenceNo string) (Payment, *Error)
	GetPaymentByTransactionId(ctx context.Context, transactionId int64) (Payment, *Error)
	// GetPaymentByPartnerReferenceNoForUpdate and GetPaymentByTransactionIdForUpdate lock the
	// payment row (SELECT ... FOR UPDATE) so cancel, confirm, expire and settle serialise on it
	// instead of racing each other to a terminal state (D6).
	GetPaymentByPartnerReferenceNoForUpdate(ctx context.Context, partnerReferenceNo string) (Payment, *Error)
	GetPaymentByTransactionIdForUpdate(ctx context.Context, transactionId int64) (Payment, *Error)
	GetPendingPaymentByCartId(ctx context.Context, cartId int64) (Payment, *Error)
	GetPaymentsBySessionId(ctx context.Context, sessionId string, skip int, limit int) ([]Payment, *Error)
	GetPaymentsBySessionIdTotal(ctx context.Context, sessionId string) (int64, *Error)
	// GetExpirablePayments returns pending, non-deleted payments whose expired_at has already
	// passed, oldest first, for ExpireStalePayments' sweep (FR-4).
	GetExpirablePayments(ctx context.Context, now time.Time, limit int) ([]Payment, *Error)
	CreatePayment(ctx context.Context, payment Payment) (Payment, *Error)
	UpdatePaymentById(ctx context.Context, payment Payment, id int64) (Payment, *Error)
}

type PaymentGatewayRepository interface {
	GenerateQris(ctx context.Context, input GenerateQrisInput) (QrisPayment, *Error)
	QueryQris(ctx context.Context, input QueryQrisInput) (QrisStatus, *Error)
}
