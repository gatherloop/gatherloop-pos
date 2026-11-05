package domain

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
