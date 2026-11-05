package fonnte

import (
	"apps/api/domain"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

type Client struct {
	config     Config
	httpClient *http.Client
	logger     *slog.Logger
}

func NewWhatsAppGatewayPort(config Config) domain.WhatsAppGatewayPort {
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

func NewDisabledWhatsAppGateway() domain.WhatsAppGatewayPort {
	return disabledClient{}
}

func (disabledClient) Send(_ context.Context, _ domain.WhatsAppMessage) (domain.WhatsAppSendResult, *domain.Error) {
	return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: disabledGatewayDetail}, nil
}

func (disabledClient) ValidateNumber(_ context.Context, _ string) (domain.WhatsAppNumberValidationResult, *domain.Error) {
	return domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusUnknown, Detail: disabledGatewayDetail}, nil
}

func (c *Client) Send(ctx context.Context, message domain.WhatsAppMessage) (domain.WhatsAppSendResult, *domain.Error) {
	body, contentType, buildErr := buildRequestBody(message)
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
		return mapRequestError(doErr), nil
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

func (c *Client) ValidateNumber(ctx context.Context, number string) (domain.WhatsAppNumberValidationResult, *domain.Error) {
	body, contentType, buildErr := buildMultipartBody(map[string]string{
		"target":      number,
		"countryCode": countryCodeAlreadyNorm,
	})
	if buildErr != nil {
		c.logger.Error("fonnte: failed to build validate request body", slog.String("error", buildErr.Error()))
		return unknownValidationOutcome(buildErr.Error()), nil
	}

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, c.config.BaseURL+validatePath, body)
	if reqErr != nil {
		return unknownValidationOutcome(reqErr.Error()), nil
	}
	req.Header.Set("Authorization", c.config.Token)
	req.Header.Set("Content-Type", contentType)

	resp, doErr := c.httpClient.Do(req)
	if doErr != nil {
		return unknownValidationOutcome(doErr.Error()), nil
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return unknownValidationOutcome(readErr.Error()), nil
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		detail := describeFailure(respBody)
		c.logger.Warn("fonnte: validate request rejected", slog.Int("status", resp.StatusCode), slog.String("response", detail))
		return unknownValidationOutcome(detail), nil
	}

	var parsed fonnteValidateResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return unknownValidationOutcome(fmt.Sprintf("body does not parse: %s", describeFailure(respBody))), nil
	}

	if !parsed.Status {
		reason := parsed.Reason
		if reason == "" {
			reason = describeFailure(respBody)
		}
		return unknownValidationOutcome(reason), nil
	}

	if len(parsed.NotRegistered) > 0 {
		return domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusNotRegistered}, nil
	}
	if len(parsed.Registered) > 0 {
		return domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil
	}
	return unknownValidationOutcome(fmt.Sprintf("number missing from both lists: %s", describeFailure(respBody))), nil
}
