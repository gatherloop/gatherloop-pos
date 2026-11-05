package doku

import (
	"crypto/rsa"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
)

type Config struct {
	BaseURL      string
	ClientId     string
	ClientSecret string
	PrivateKey   *rsa.PrivateKey
	MerchantId   string
	ChannelId    string
	TerminalId   string
	PostalCode   string
	FeeType      string
}

func (c Config) Validate() error {
	var missing []string

	for _, field := range []struct {
		name  string
		value string
	}{
		{"DOKU_BASE_URL", c.BaseURL},
		{"DOKU_CLIENT_ID", c.ClientId},
		{"DOKU_CLIENT_SECRET", c.ClientSecret},
		{"DOKU_MERCHANT_ID", c.MerchantId},
		{"DOKU_CHANNEL_ID", c.ChannelId},
		{"DOKU_TERMINAL_ID", c.TerminalId},
	} {
		if field.value == "" {
			missing = append(missing, field.name)
		}
	}

	if c.PrivateKey == nil {
		missing = append(missing, "DOKU_PRIVATE_KEY")
	}

	if len(missing) > 0 {
		return fmt.Errorf("doku: missing configuration: %s", strings.Join(missing, ", "))
	}
	return nil
}

type Client struct {
	config     Config
	httpClient *http.Client
	token      *tokenCache
	logger     *slog.Logger
}

type failureResponse struct {
	ResponseCode    string `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
}

type qrisAmount struct {
	Value    string `json:"value"`
	Currency string `json:"currency"`
}

type qrisAmountResponse struct {
	Value    float32 `json:"value"`
	Currency string  `json:"currency"`
}

type qrisAdditionalInfo struct {
	PostalCode string `json:"postalCode,omitempty"`
	FeeType    string `json:"feeType,omitempty"`
}

type generateQrisRequest struct {
	PartnerReferenceNo string             `json:"partnerReferenceNo"`
	Amount             qrisAmount         `json:"amount"`
	MerchantId         string             `json:"merchantId"`
	TerminalId         string             `json:"terminalId"`
	ValidityPeriod     string             `json:"validityPeriod,omitempty"`
	AdditionalInfo     qrisAdditionalInfo `json:"additionalInfo"`
}

type generateQrisResponse struct {
	ResponseCode       string `json:"responseCode"`
	ResponseMessage    string `json:"responseMessage"`
	ReferenceNo        string `json:"referenceNo"`
	PartnerReferenceNo string `json:"partnerReferenceNo"`
	QrContent          string `json:"qrContent"`
}

type queryQrisRequest struct {
	OriginalPartnerReferenceNo string `json:"originalPartnerReferenceNo"`
	OriginalReferenceNo        string `json:"originalReferenceNo"`
	MerchantId                 string `json:"merchantId"`
	ServiceCode                string `json:"serviceCode"`
}

type queryQrisResponse struct {
	ResponseCode               string             `json:"responseCode"`
	ResponseMessage            string             `json:"responseMessage"`
	OriginalPartnerReferenceNo string             `json:"originalPartnerReferenceNo"`
	OriginalReferenceNo        string             `json:"originalReferenceNo"`
	LatestTransactionStatus    string             `json:"latestTransactionStatus"`
	TransactionStatusDesc      string             `json:"transactionStatusDesc"`
	Amount                     qrisAmountResponse `json:"amount"`
}

type cancelQrisRequest struct {
	PartnerReferenceNo string `json:"partnerReferenceNo"`
	ReferenceNo        string `json:"referenceNo"`
	MerchantId         string `json:"merchantId"`
	Reason             string `json:"reason,omitempty"`
}

type cancelQrisResponse struct {
	ResponseCode       string `json:"responseCode"`
	ResponseMessage    string `json:"responseMessage"`
	PartnerReferenceNo string `json:"partnerReferenceNo"`
	ReferenceNo        string `json:"referenceNo"`
	ExpiredDate        string `json:"expiredDate"`
}
