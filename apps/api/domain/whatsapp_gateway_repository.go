//go:generate mockgen -source=whatsapp_gateway_repository.go -destination=../data/mock/whatsapp_gateway_repository.go -package=mock

package domain

import "context"

type WhatsAppMessage struct {
	To   string
	Body string
}

type WhatsAppSendOutcome string

const (
	WhatsAppSendOutcomeAccepted WhatsAppSendOutcome = "accepted"
	WhatsAppSendOutcomeRejected WhatsAppSendOutcome = "rejected"
	WhatsAppSendOutcomeUnknown  WhatsAppSendOutcome = "unknown"
)

type WhatsAppSendResult struct {
	Outcome           WhatsAppSendOutcome
	ProviderMessageId string
	Detail            string
}

// WhatsAppGatewayNotConfiguredDetail is the sentinel a disabled gateway returns (D10): the
// dispatcher maps it to 'skipped', not to a retry, since it names a configuration fact rather
// than a delivery failure.
const WhatsAppGatewayNotConfiguredDetail = "whatsapp gateway not configured"

type WhatsAppNumberStatus string

const (
	WhatsAppNumberStatusRegistered    WhatsAppNumberStatus = "registered"
	WhatsAppNumberStatusNotRegistered WhatsAppNumberStatus = "not_registered"
	WhatsAppNumberStatusUnknown       WhatsAppNumberStatus = "unknown"
)

type WhatsAppNumberValidationResult struct {
	Status WhatsAppNumberStatus
	Detail string
}

// One message, one recipient: a guest notification never has more than one (D1).
type WhatsAppGatewayRepository interface {
	Send(ctx context.Context, message WhatsAppMessage) (WhatsAppSendResult, *Error)
	ValidateNumber(ctx context.Context, number string) (WhatsAppNumberValidationResult, *Error)
}
