package fonnte

import (
	"apps/api/domain"
	"fmt"
	"time"
)

const (
	sendPath               = "/send"
	validatePath           = "/validate"
	defaultBaseURL         = "https://api.fonnte.com"
	requestTimeout         = 15 * time.Second
	maxFailureDetailLength = 512
	disabledGatewayDetail  = domain.WhatsAppGatewayNotConfiguredDetail
	countryCodeAlreadyNorm = "0"
)

type Config struct {
	Token   string
	BaseURL string
}

func (c Config) Validate() error {
	if c.Token == "" {
		return fmt.Errorf("fonnte: missing configuration: FONNTE_TOKEN")
	}
	return nil
}

type fonnteSendResponse struct {
	Status bool     `json:"status"`
	Reason string   `json:"reason,omitempty"`
	Id     []string `json:"id,omitempty"`
	Quota  any      `json:"quota,omitempty"`
}

type fonnteValidateResponse struct {
	Status        bool     `json:"status"`
	Reason        string   `json:"reason,omitempty"`
	Registered    []string `json:"registered,omitempty"`
	NotRegistered []string `json:"not_registered,omitempty"`
}
