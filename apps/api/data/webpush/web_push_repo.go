package webpush

import (
	"apps/api/domain"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	webpushgo "github.com/SherClockHolmes/webpush-go"
)

const maxFailureDetailLength = 512

type Config struct {
	PublicKey  string
	PrivateKey string
	Subject    string
}

func (c Config) Validate() error {
	if c.PublicKey == "" || c.PrivateKey == "" {
		return fmt.Errorf("webpush: missing configuration: WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY")
	}
	if c.Subject == "" {
		return fmt.Errorf("webpush: missing configuration: WEB_PUSH_SUBJECT")
	}
	return nil
}

type Client struct {
	config Config
	logger *slog.Logger
}

func NewWebPushGatewayRepository(config Config) domain.WebPushGatewayRepository {
	return NewClient(config)
}

func NewClient(config Config) *Client {
	return &Client{
		config: config,
		logger: slog.Default(),
	}
}

type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Tag   string `json:"tag,omitempty"`
	URL   string `json:"url,omitempty"`
}

func toPushPayload(message domain.WebPushMessage) pushPayload {
	return pushPayload{Title: message.Title, Body: message.Body, Tag: message.Tag, URL: message.URL}
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

func (c *Client) Send(ctx context.Context, messages []domain.WebPushMessage) ([]domain.WebPushReceipt, *domain.Error) {
	if len(messages) == 0 {
		return nil, nil
	}

	receipts := make([]domain.WebPushReceipt, 0, len(messages))
	for _, message := range messages {
		receipts = append(receipts, c.send(ctx, message))
	}
	return receipts, nil
}

func (c *Client) send(ctx context.Context, message domain.WebPushMessage) domain.WebPushReceipt {
	payload, marshalErr := json.Marshal(toPushPayload(message))
	if marshalErr != nil {
		c.logger.Error("webpush: failed to build payload", slog.String("error", marshalErr.Error()))
		return domain.WebPushReceipt{Status: domain.WebPushReceiptStatusError, Message: "failed to build push payload"}
	}

	subscription := &webpushgo.Subscription{
		Endpoint: message.Endpoint,
		Keys:     webpushgo.Keys{Auth: message.AuthKey, P256dh: message.P256dhKey},
	}

	resp, sendErr := webpushgo.SendNotificationWithContext(ctx, payload, subscription, &webpushgo.Options{
		Subscriber:      c.config.Subject,
		VAPIDPublicKey:  c.config.PublicKey,
		VAPIDPrivateKey: c.config.PrivateKey,
		TTL:             domain.WebPushTTLSeconds,
		Urgency:         webpushgo.UrgencyHigh,
	})
	if sendErr != nil {
		c.logger.Error("webpush: request failed", slog.String("error", sendErr.Error()))
		return domain.WebPushReceipt{Status: domain.WebPushReceiptStatusError, Message: sendErr.Error()}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return domain.WebPushReceipt{Status: domain.WebPushReceiptStatusOk}
	}

	detail := describeFailure(body)

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return domain.WebPushReceipt{Status: domain.WebPushReceiptStatusError, Message: detail, ErrorCode: domain.WebPushErrorCodeGone}
	}

	c.logger.Error("webpush: request rejected", slog.Int("status", resp.StatusCode), slog.String("response", detail))
	return domain.WebPushReceipt{Status: domain.WebPushReceiptStatusError, Message: fmt.Sprintf("web push request failed with status %d: %s", resp.StatusCode, detail)}
}
