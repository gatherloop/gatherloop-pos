package expopush

import (
	"fmt"
	"log/slog"
	"net/http"
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

type pushMessageRequest struct {
	To        string         `json:"to"`
	Title     string         `json:"title,omitempty"`
	Body      string         `json:"body,omitempty"`
	Sound     string         `json:"sound,omitempty"`
	ChannelId string         `json:"channelId,omitempty"`
	Priority  string         `json:"priority,omitempty"`
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
