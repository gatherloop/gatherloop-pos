//go:generate mockgen -source=whatsapp_number_verification_repository.go -destination=../data/mock/whatsapp_number_verification_repository.go -package=mock

package domain

import (
	"context"
	"time"
)

// WhatsappNumberVerificationRepository caches positive results only (D4 of
// docs/prd-order-whatsapp-number-validation.md): a row's existence means Fonnte has confirmed the
// number has WhatsApp, so the same number never needs to be sent to Fonnte again.
type WhatsappNumberVerificationRepository interface {
	IsWhatsappNumberVerified(ctx context.Context, whatsappNumber string) (bool, *Error)
	MarkWhatsappNumberVerified(ctx context.Context, whatsappNumber string, verifiedAt time.Time) *Error
}
