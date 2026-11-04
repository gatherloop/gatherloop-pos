//go:generate mockgen -source=payment_verification_repository.go -destination=../data/mock/payment_verification_repository.go -package=mock

package domain

import "context"

type PaymentVerificationRepository interface {
	Create(ctx context.Context, photo PaymentVerificationPhoto) *Error
	GetByPaymentId(ctx context.Context, paymentId int64) (PaymentVerificationPhoto, *Error)
	DeleteByPaymentId(ctx context.Context, paymentId int64) *Error
	DeleteOrphaned(ctx context.Context, limit int) (int64, *Error)
}
