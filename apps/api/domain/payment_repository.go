//go:generate mockgen -source=payment_repository.go -destination=../data/mock/payment_repository.go -package=mock

package domain

import "context"

type PaymentRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetPaymentByPartnerReferenceNo(ctx context.Context, partnerReferenceNo string) (Payment, *Error)
	GetPendingPaymentByCartId(ctx context.Context, cartId int64) (Payment, *Error)
	CreatePayment(ctx context.Context, payment Payment) (Payment, *Error)
	UpdatePaymentById(ctx context.Context, payment Payment, id int64) (Payment, *Error)
}

type PaymentGatewayRepository interface {
	GenerateQris(ctx context.Context, input GenerateQrisInput) (QrisPayment, *Error)
	QueryQris(ctx context.Context, input QueryQrisInput) (QrisStatus, *Error)
}
