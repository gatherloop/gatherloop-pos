//go:generate mockgen -source=whatsapp_number_verification_usecase.go -destination=../data/mock/whatsapp_number_verifier.go -package=mock

package domain

import (
	"context"
	"log/slog"
	"time"
)

// WhatsappNumberValidationTimeout bounds EnsureRegistered's Fonnte round trip (D6), separate from
// Send's 15s: the guest is watching the checkout spinner, unlike Send's background dispatch.
const WhatsappNumberValidationTimeout = 5 * time.Second

// WhatsappNumberVerifier is what PaymentUsecase.Checkout depends on (D1): confirm a normalized
// number has WhatsApp before an order can be created from it. WhatsappNumberVerificationUsecase
// is the real implementation; NoopWhatsappNumberVerifier is main.go's kill-switch wiring (D8).
type WhatsappNumberVerifier interface {
	EnsureRegistered(ctx context.Context, normalizedNumber string) *Error
}

type WhatsappNumberVerificationUsecase struct {
	verificationRepository WhatsappNumberVerificationRepository
	gateway                WhatsAppGatewayRepository
}

func NewWhatsappNumberVerificationUsecase(
	verificationRepository WhatsappNumberVerificationRepository,
	gateway WhatsAppGatewayRepository,
) WhatsappNumberVerificationUsecase {
	return WhatsappNumberVerificationUsecase{
		verificationRepository: verificationRepository,
		gateway:                gateway,
	}
}

// EnsureRegistered is FR-2/FR-3/FR-4: a cache hit skips Fonnte entirely; a registered answer is
// persisted so no session ever pays for the same lookup twice (D2/D4); anything but a definite
// not_registered fails open (D3) — a cache-read failure is treated as a miss rather than blocking
// the checkout, so it still gets a real answer from the gateway.
func (usecase WhatsappNumberVerificationUsecase) EnsureRegistered(ctx context.Context, normalizedNumber string) *Error {
	if verified, err := usecase.verificationRepository.IsWhatsappNumberVerified(ctx, normalizedNumber); err != nil {
		slog.WarnContext(ctx, "whatsapp number verification cache lookup failed, falling back to the gateway",
			slog.String("error", err.Message))
	} else if verified {
		return nil
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, WhatsappNumberValidationTimeout)
	defer cancel()

	result, validateErr := usecase.gateway.ValidateNumber(timeoutCtx, normalizedNumber)
	if validateErr != nil {
		slog.WarnContext(ctx, "whatsapp number validation unavailable", slog.String("detail", validateErr.Message))
		return nil
	}

	switch result.Status {
	case WhatsAppNumberStatusRegistered:
		if markErr := usecase.verificationRepository.MarkWhatsappNumberVerified(ctx, normalizedNumber, time.Now()); markErr != nil {
			slog.WarnContext(ctx, "failed to persist a confirmed whatsapp number", slog.String("error", markErr.Message))
		}
		return nil
	case WhatsAppNumberStatusNotRegistered:
		return &Error{
			Type:    BadRequest,
			Message: "customerWhatsappNumber is not registered on WhatsApp",
			Reason:  ErrorReasonWhatsappNumberNotRegistered,
		}
	default:
		slog.WarnContext(ctx, "whatsapp number validation unavailable", slog.String("detail", result.Detail))
		return nil
	}
}

// NoopWhatsappNumberVerifier is main.go's WHATSAPP_NUMBER_VALIDATION_ENABLED=false wiring (D8,
// FR-7): checkout behaves exactly as it did before this feature.
type NoopWhatsappNumberVerifier struct{}

func (NoopWhatsappNumberVerifier) EnsureRegistered(ctx context.Context, normalizedNumber string) *Error {
	return nil
}
