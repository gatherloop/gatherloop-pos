package fonnte

import (
	"apps/api/domain"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net"
	"net/http"
	"strings"
	"time"
)

const (
	sendPath               = "/send"
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

type Client struct {
	config     Config
	httpClient *http.Client
	logger     *slog.Logger
}

func NewWhatsAppGatewayRepository(config Config) domain.WhatsAppGatewayRepository {
	return NewClient(config)
}

func NewClient(config Config) *Client {
	baseURL := strings.TrimRight(config.BaseURL, "/")
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	config.BaseURL = baseURL
	return &Client{
		config:     config,
		httpClient: &http.Client{Timeout: requestTimeout},
		logger:     slog.Default(),
	}
}

type disabledClient struct{}

// Every send is rejected with a sentinel detail the dispatcher maps to "skipped", not a retry (D10).
func NewDisabledWhatsAppGateway() domain.WhatsAppGatewayRepository {
	return disabledClient{}
}

func (disabledClient) Send(_ context.Context, _ domain.WhatsAppMessage) (domain.WhatsAppSendResult, *domain.Error) {
	return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: disabledGatewayDetail}, nil
}

type fonnteSendResponse struct {
	Status bool     `json:"status"`
	Reason string   `json:"reason,omitempty"`
	Id     []string `json:"id,omitempty"`
	Quota  any      `json:"quota,omitempty"`
}

func describeFailure(body []byte) string {
	raw := strings.TrimSpace(string(body))
	if raw == "" {
		return "<empty response body>"
	}
	if len(raw) > maxFailureDetailLength {
		return raw[:maxFailureDetailLength] + "..."
	}
	return raw
}

func unknownOutcome(detail string) domain.WhatsAppSendResult {
	return domain.WhatsAppSendResult{
		Outcome: domain.WhatsAppSendOutcomeUnknown,
		Detail:  fmt.Sprintf("outcome unknown: %s", detail),
	}
}

// A dial error means no byte of the request was written; anything else may have reached Fonnte (FR-8).
func isDialError(err error) bool {
	var opErr *net.OpError
	return errors.As(err, &opErr) && opErr.Op == "dial"
}

func (c *Client) mapRequestError(err error) domain.WhatsAppSendResult {
	if isDialError(err) {
		return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: err.Error()}
	}
	return unknownOutcome(err.Error())
}

func (c *Client) buildRequestBody(message domain.WhatsAppMessage) (*bytes.Buffer, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for field, value := range map[string]string{
		"target":      message.To,
		"message":     message.Body,
		"countryCode": countryCodeAlreadyNorm,
	} {
		if err := writer.WriteField(field, value); err != nil {
			return nil, "", err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, "", err
	}

	return body, writer.FormDataContentType(), nil
}

func (c *Client) Send(ctx context.Context, message domain.WhatsAppMessage) (domain.WhatsAppSendResult, *domain.Error) {
	body, contentType, buildErr := c.buildRequestBody(message)
	if buildErr != nil {
		c.logger.Error("fonnte: failed to build request body", slog.String("error", buildErr.Error()))
		return unknownOutcome(buildErr.Error()), nil
	}

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, c.config.BaseURL+sendPath, body)
	if reqErr != nil {
		return unknownOutcome(reqErr.Error()), nil
	}
	req.Header.Set("Authorization", c.config.Token)
	req.Header.Set("Content-Type", contentType)

	resp, doErr := c.httpClient.Do(req)
	if doErr != nil {
		return c.mapRequestError(doErr), nil
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return unknownOutcome(readErr.Error()), nil
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		detail := describeFailure(respBody)
		c.logger.Error("fonnte: request rejected", slog.Int("status", resp.StatusCode), slog.String("response", detail))
		return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: detail}, nil
	}

	var parsed fonnteSendResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return unknownOutcome(fmt.Sprintf("body does not parse: %s", describeFailure(respBody))), nil
	}

	if !parsed.Status {
		reason := parsed.Reason
		if reason == "" {
			reason = describeFailure(respBody)
		}
		return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: reason}, nil
	}

	providerMessageId := ""
	if len(parsed.Id) > 0 {
		providerMessageId = parsed.Id[0]
	}
	if parsed.Quota != nil {
		c.logger.Info("fonnte: message accepted", slog.Any("quota", parsed.Quota))
	}
	return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeAccepted, ProviderMessageId: providerMessageId}, nil
}
