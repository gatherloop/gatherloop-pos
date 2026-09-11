package doku

import (
	"apps/api/domain"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

const tokenRefreshMargin = 60 * time.Second

type tokenResponse struct {
	ResponseCode    string `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
	AccessToken     string `json:"accessToken"`
	TokenType       string `json:"tokenType"`
	ExpiresIn       int    `json:"expiresIn"`
}

type tokenCache struct {
	mu        sync.Mutex
	value     string
	expiresAt time.Time
}

func (c *tokenCache) get() (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.value == "" || !time.Now().Before(c.expiresAt) {
		return "", false
	}
	return c.value, true
}

func (c *tokenCache) set(value string, expiresIn int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value = value
	c.expiresAt = time.Now().Add(time.Duration(expiresIn)*time.Second - tokenRefreshMargin)
}

func (c *tokenCache) invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value = ""
}

func (c *Client) getAccessToken(ctx context.Context) (string, *domain.Error) {
	if token, ok := c.token.get(); ok {
		return token, nil
	}
	return c.fetchAccessToken(ctx)
}

func (c *Client) fetchAccessToken(ctx context.Context) (string, *domain.Error) {
	timestamp := formatTimestamp(time.Now())
	signature, sigErr := signAsymmetric(c.config.PrivateKey, c.config.ClientId, timestamp)
	if sigErr != nil {
		c.logger.Error("doku: failed to sign access token request", slog.String("error", sigErr.Error()))
		return "", &domain.Error{Type: domain.InternalServerError, Message: "failed to sign DOKU access token request"}
	}

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, c.config.BaseURL+tokenPath, bytes.NewReader([]byte(`{"grantType":"client_credentials"}`)))
	if reqErr != nil {
		return "", &domain.Error{Type: domain.InternalServerError, Message: "failed to build DOKU access token request"}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CLIENT-KEY", c.config.ClientId)
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)

	resp, doErr := c.httpClient.Do(req)
	if doErr != nil {
		c.logger.Error("doku: access token request failed", slog.String("error", doErr.Error()))
		return "", &domain.Error{Type: domain.InternalServerError, Message: "failed to reach DOKU"}
	}
	defer resp.Body.Close()

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return "", &domain.Error{Type: domain.InternalServerError, Message: "failed to read DOKU access token response"}
	}

	var parsed tokenResponse
	if jsonErr := json.Unmarshal(body, &parsed); jsonErr != nil {
		c.logger.Error("doku: failed to parse access token response", slog.Int("status", resp.StatusCode))
		return "", &domain.Error{Type: domain.InternalServerError, Message: "failed to parse DOKU access token response"}
	}

	if resp.StatusCode != http.StatusOK || parsed.AccessToken == "" {
		c.logger.Error("doku: access token request rejected",
			slog.Int("status", resp.StatusCode),
			slog.String("responseCode", parsed.ResponseCode),
			slog.String("responseMessage", parsed.ResponseMessage),
			slog.String("baseUrl", c.config.BaseURL),
			slog.String("clientId", maskCredential(c.config.ClientId)),
		)
		return "", &domain.Error{Type: domain.InternalServerError, Message: fmt.Sprintf("DOKU access token request failed: %s (%s)", parsed.ResponseMessage, parsed.ResponseCode)}
	}

	c.token.set(parsed.AccessToken, parsed.ExpiresIn)
	c.logger.Info("doku: fetched access token", slog.Int("expiresIn", parsed.ExpiresIn))
	return parsed.AccessToken, nil
}
