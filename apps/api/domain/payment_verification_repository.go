//go:generate mockgen -source=payment_verification_repository.go -destination=../data/mock/payment_verification_repository.go -package=mock

package domain

import "context"

// PaymentVerificationRepository stores the COD presence-verification photo. D5's invariant — a
// row exists iff its payment is cod, pending and awaiting — is kept by every caller: Checkout
// creates it, and every exit from that state (approve, reject, cancel, expiry, supersede) deletes
// it in the same DB transaction as the decision.
type PaymentVerificationRepository interface {
	Create(ctx context.Context, photo PaymentVerificationPhoto) *Error
	GetByPaymentId(ctx context.Context, paymentId int64) (PaymentVerificationPhoto, *Error)
	// DeleteByPaymentId is not an error when there is no matching row: every terminal path calls
	// it unconditionally, including ones whose payment never had a photo (a non-COD method).
	DeleteByPaymentId(ctx context.Context, paymentId int64) *Error
	// DeleteOrphaned is the D5 backstop, run on the maintenance sweeper tick: photos whose payment
	// is no longer cod + pending + awaiting. It should always delete zero rows; the caller logs a
	// non-zero count at warn because it means some path broke the invariant.
	DeleteOrphaned(ctx context.Context, limit int) (int64, *Error)
}
