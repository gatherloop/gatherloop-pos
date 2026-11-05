package expopush

import (
	"apps/api/domain"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

func NewKdsNotificationGatewayPort(config Config) domain.KdsNotificationGatewayPort {
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

func (c *Client) Send(ctx context.Context, messages []domain.KdsPushMessage) ([]domain.KdsPushReceipt, *domain.Error) {
	if len(messages) == 0 {
		return nil, nil
	}

	payload := make([]pushMessageRequest, 0, len(messages))
	for _, message := range messages {
		payload = append(payload, toPushMessageRequest(message))
	}

	body, marshalErr := json.Marshal(payload)
	if marshalErr != nil {
		return nil, &domain.Error{Type: domain.InternalServerError, Message: "failed to build Expo push request body"}
	}

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, c.config.BaseURL+sendPath, bytes.NewReader(body))
	if reqErr != nil {
		return nil, &domain.Error{Type: domain.InternalServerError, Message: "failed to build Expo push request"}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Authorization", "Bearer "+c.config.AccessToken)

	resp, doErr := c.httpClient.Do(req)
	if doErr != nil {
		c.logger.Error("expopush: request failed", slog.String("error", doErr.Error()))
		return nil, &domain.Error{Type: domain.BadGateway, Message: "failed to reach Expo push service"}
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, &domain.Error{Type: domain.BadGateway, Message: "failed to read Expo push response"}
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		detail := describeFailure(respBody)
		c.logger.Error("expopush: request rejected", slog.Int("status", resp.StatusCode), slog.String("response", detail))
		return nil, &domain.Error{Type: domain.BadGateway, Message: fmt.Sprintf("Expo push request failed with status %d: %s", resp.StatusCode, detail)}
	}

	var parsed sendResponse
	if jsonErr := json.Unmarshal(respBody, &parsed); jsonErr != nil {
		c.logger.Error("expopush: failed to parse response", slog.String("error", jsonErr.Error()))
		return nil, &domain.Error{Type: domain.BadGateway, Message: "failed to parse Expo push response"}
	}

	receipts := make([]domain.KdsPushReceipt, 0, len(parsed.Data))
	for _, receipt := range parsed.Data {
		receipts = append(receipts, toKdsPushReceipt(receipt))
	}

	return receipts, nil
}
