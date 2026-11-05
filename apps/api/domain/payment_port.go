//go:generate mockgen -source=payment_port.go -destination=../data/mock/payment_port.go -package=mock

package domain

import (
	"context"
	"time"
)

type PaymentRepoPort interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetPaymentByPartnerReferenceNo(ctx context.Context, partnerReferenceNo string) (Payment, *Error)
	GetPaymentByTransactionId(ctx context.Context, transactionId int64) (Payment, *Error)
	GetPaymentByPartnerReferenceNoForUpdate(ctx context.Context, partnerReferenceNo string) (Payment, *Error)
	GetPaymentByTransactionIdForUpdate(ctx context.Context, transactionId int64) (Payment, *Error)
	GetPendingPaymentByCartId(ctx context.Context, cartId int64) (Payment, *Error)
	GetPaymentsBySessionId(ctx context.Context, sessionId string, skip int, limit int) ([]Payment, *Error)
	GetPaymentsBySessionIdTotal(ctx context.Context, sessionId string) (int64, *Error)
	GetExpirablePayments(ctx context.Context, now time.Time, limit int) ([]Payment, *Error)
	CreatePayment(ctx context.Context, payment Payment) (Payment, *Error)
	UpdatePaymentById(ctx context.Context, payment Payment, id int64) (Payment, *Error)
}

type PaymentGatewayPort interface {
	GenerateQris(ctx context.Context, input GenerateQrisInput) (QrisPayment, *Error)
	QueryQris(ctx context.Context, input QueryQrisInput) (QrisStatus, *Error)
	CancelQris(ctx context.Context, input CancelQrisInput) *Error
}
