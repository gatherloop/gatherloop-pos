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
	"time"
)

const (
	sendPath               = "/--/api/v2/push/send"
	defaultBaseURL         = "https://exp.host"
	requestTimeout         = 10 * time.Second
	statusOk               = "ok"
	maxFailureDetailLength = 512
)

type Config struct {
	BaseURL     string
	AccessToken string
}

func (c Config) Validate() error {
	if c.AccessToken == "" {
		return fmt.Errorf("expopush: missing configuration: EXPO_PUSH_ACCESS_TOKEN")
	}
	return nil
}

type Client struct {
	config     Config
	httpClient *http.Client
	logger     *slog.Logger
}

func NewKdsPushGatewayRepository(config Config) domain.KdsPushGatewayRepository {
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

type pushMessageRequest struct {
	To        string         `json:"to"`
	Title     string         `json:"title,omitempty"`
	Body      string         `json:"body,omitempty"`
	Sound     string         `json:"sound,omitempty"`
	ChannelId string         `json:"channelId,omitempty"`
	Data      map[string]any `json:"data,omitempty"`
}

type pushReceiptDetails struct {
	Error string `json:"error,omitempty"`
}

type pushReceiptResponse struct {
	Status  string             `json:"status"`
	Id      string             `json:"id,omitempty"`
	Message string             `json:"message,omitempty"`
	Details pushReceiptDetails `json:"details,omitempty"`
}

type sendResponse struct {
	Data []pushReceiptResponse `json:"data"`
}

func toPushMessageRequest(message domain.KdsPushMessage) pushMessageRequest {
	return pushMessageRequest{
		To:        message.To,
		Title:     message.Title,
		Body:      message.Body,
		Sound:     message.Sound,
		ChannelId: message.ChannelId,
		Data:      message.Data,
	}
}

func toKdsPushReceipt(receipt pushReceiptResponse) domain.KdsPushReceipt {
	status := domain.KdsPushReceiptStatusError
	if receipt.Status == statusOk {
		status = domain.KdsPushReceiptStatusOk
	}
	return domain.KdsPushReceipt{
		Status:    status,
		Message:   receipt.Message,
		ErrorCode: receipt.Details.Error,
	}
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
