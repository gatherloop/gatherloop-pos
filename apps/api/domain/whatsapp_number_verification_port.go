//go:generate mockgen -source=whatsapp_number_verification_port.go -destination=../data/mock/whatsapp_number_verification_port.go -package=mock

package domain

import (
	"context"
	"time"
)

type WhatsAppNumberVerificationRepoPort interface {
	IsWhatsAppNumberVerified(ctx context.Context, whatsAppNumber string) (bool, *Error)
	MarkWhatsAppNumberVerified(ctx context.Context, whatsAppNumber string, verifiedAt time.Time) *Error
}

type WhatsAppGatewayPort interface {
	Send(ctx context.Context, message WhatsAppMessage) (WhatsAppSendResult, *Error)
	ValidateNumber(ctx context.Context, number string) (WhatsAppNumberValidationResult, *Error)
}
