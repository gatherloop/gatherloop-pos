package domain

import (
	"context"
	"log/slog"
	"time"
)

const WhatsappNumberValidationTimeout = 5 * time.Second

type WhatsappNumberVerificationService struct {
	whatsAppNumberVerificationRepoPort WhatsAppNumberVerificationRepoPort
	whatsAppGatewayPort                WhatsAppGatewayPort
}

func NewWhatsappNumberVerificationUsecase(
	whatsAppNumberVerificationRepoPort WhatsAppNumberVerificationRepoPort,
	whatsAppGatewayPort WhatsAppGatewayPort,
) WhatsappNumberVerificationService {
	return WhatsappNumberVerificationService{
		whatsAppNumberVerificationRepoPort: whatsAppNumberVerificationRepoPort,
		whatsAppGatewayPort:                whatsAppGatewayPort,
	}
}

func (usecase WhatsappNumberVerificationService) EnsureRegistered(ctx context.Context, normalizedNumber string) *Error {
	if verified, err := usecase.whatsAppNumberVerificationRepoPort.IsWhatsAppNumberVerified(ctx, normalizedNumber); err != nil {
		slog.WarnContext(ctx, "whatsapp number verification cache lookup failed, falling back to the gateway",
			slog.String("error", err.Message))
	} else if verified {
		return nil
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, WhatsappNumberValidationTimeout)
	defer cancel()

	result, validateErr := usecase.whatsAppGatewayPort.ValidateNumber(timeoutCtx, normalizedNumber)
	if validateErr != nil {
		slog.WarnContext(ctx, "whatsapp number validation unavailable", slog.String("detail", validateErr.Message))
		return nil
	}

	switch result.Status {
	case WhatsAppNumberStatusRegistered:
		if markErr := usecase.whatsAppNumberVerificationRepoPort.MarkWhatsAppNumberVerified(ctx, normalizedNumber, time.Now()); markErr != nil {
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
