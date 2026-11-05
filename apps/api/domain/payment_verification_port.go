//go:generate mockgen -source=payment_verification_port.go -destination=../data/mock/payment_verification_port.go -package=mock

package domain

import "context"

type PaymentVerificationRepoPort interface {
	Create(ctx context.Context, photo PaymentVerificationPhoto) *Error
	GetByPaymentId(ctx context.Context, paymentId int64) (PaymentVerificationPhoto, *Error)
	DeleteByPaymentId(ctx context.Context, paymentId int64) *Error
	DeleteOrphaned(ctx context.Context, limit int) (int64, *Error)
}
