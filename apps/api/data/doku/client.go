// Package doku implements domain.PaymentGatewayRepository against DOKU's
// SNAP Direct API for QRIS MPM (D3). Everything DOKU-shaped — base URLs,
// header names, field names, response codes — lives here and nowhere else,
// which is the point of the port: a wrong detail costs this package, not
// the domain (see the PRD's verification note on phase 3).
package doku

import (
	"apps/api/domain"
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

const (
	tokenPath      = "/authorization/v1/access-token/b2b"
	qrGeneratePath = "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate"
	qrQueryPath    = "/snap-adapter/b2b/v1.0/qr/qr-mpm-query"

	qrisServiceCode = "47"

	// tokenRefreshMargin refreshes the cached access token 60s ahead of its
	// stated expiry (FR-3: "refresh at expiresIn - 60s").
	tokenRefreshMargin = 60 * time.Second

	requestTimeout = 10 * time.Second
)

// Config is everything the DOKU client needs, sourced from utils.Env — see
// .env.example for what each maps to and D21 for sandbox vs production.
type Config struct {
	BaseURL      string
	ClientId     string
	ClientSecret string
	PrivateKey   *rsa.PrivateKey
	MerchantId   string
	ChannelId    string
}

// Client implements domain.PaymentGatewayRepository.
type Client struct {
	config     Config
	httpClient *http.Client
	token      *tokenCache
	logger     *slog.Logger
}

// NewPaymentGatewayRepository wires a DOKU-backed
// domain.PaymentGatewayRepository, following the same
// New<Thing>Repository(...) domain.<Thing>Repository shape every
// data/mysql constructor uses.
func NewPaymentGatewayRepository(config Config) domain.PaymentGatewayRepository {
	return &Client{
		config:     config,
		httpClient: &http.Client{Timeout: requestTimeout},
		token:      &tokenCache{},
		logger:     slog.Default(),
	}
}

// ParsePrivateKeyPEM parses DOKU_PRIVATE_KEY (PEM, PKCS#1 or PKCS#8) into
// the *rsa.PrivateKey the asymmetric access-token signature is computed
// with.
func ParsePrivateKeyPEM(pemStr string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, fmt.Errorf("doku: DOKU_PRIVATE_KEY is not valid PEM")
	}

	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}

	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("doku: failed to parse DOKU_PRIVATE_KEY: %w", err)
	}
	rsaKey, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("doku: DOKU_PRIVATE_KEY is not an RSA key")
	}
	return rsaKey, nil
}

// formatTimestamp renders the millisecond-precision, offset-qualified
// timestamp SNAP expects (e.g. "2021-01-08T09:57:39.877+07:00"), which
// time.RFC3339Nano also accepts when parsing an inbound one.
func formatTimestamp(t time.Time) string {
	return t.Format("2006-01-02T15:04:05.000Z07:00")
}

// formatAmount renders a float amount as SNAP's two-decimal string
// ("10000.00"), never a bare number.
func formatAmount(amount float32) string {
	return strconv.FormatFloat(float64(amount), 'f', 2, 32)
}

// isSuccessResponseCode reports whether a SNAP responseCode denotes success.
// Every success code in the PRD's DOKU table (`2004700`, `2005500`, …)
// starts with "200"; this is the general SNAP convention, not a detail
// specific to one endpoint.
func isSuccessResponseCode(code string) bool {
	return len(code) >= 3 && code[:3] == "200"
}

// mapTransactionStatus normalises DOKU's latestTransactionStatus into
// PaymentGatewayStatus. "00" (success) is confirmed by the PRD's DOKU
// table; the other codes below are this package's best-effort mapping from
// DOKU's public SNAP documentation index, which is exactly the detail the
// PRD's verification note flags as unconfirmed against the merchant
// dashboard. Getting one wrong costs only this function — an unrecognised
// code resolves to pending, never paid, so it can never look like a
// completed payment (FR-3's test requirement).
func mapTransactionStatus(code string) domain.PaymentGatewayStatus {
	switch code {
	case "00":
		return domain.PaymentGatewayStatusPaid
	case "05":
		return domain.PaymentGatewayStatusExpired
	case "06", "07":
		return domain.PaymentGatewayStatusFailed
	default:
		return domain.PaymentGatewayStatusPending
	}
}

// send signs and issues one signed POST request and returns its raw body
// and status code. It never logs the signature, the access token, the
// client secret or the private key — only the path and status (FR-3 /
// NFR "Secrecy").
func (c *Client) send(ctx context.Context, path string, body []byte, accessToken string) ([]byte, int, *domain.Error) {
	timestamp := formatTimestamp(time.Now())
	signature, sigErr := signSymmetric(c.config.ClientSecret, http.MethodPost, path, accessToken, body, timestamp)
	if sigErr != nil {
		return nil, 0, &domain.Error{Type: domain.InternalServerError, Message: "failed to sign DOKU request"}
	}

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, c.config.BaseURL+path, bytes.NewReader(body))
	if reqErr != nil {
		return nil, 0, &domain.Error{Type: domain.InternalServerError, Message: "failed to build DOKU request"}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-PARTNER-ID", c.config.ClientId)
	req.Header.Set("X-EXTERNAL-ID", generateExternalId())
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)
	req.Header.Set("CHANNEL-ID", c.config.ChannelId)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, doErr := c.httpClient.Do(req)
	if doErr != nil {
		c.logger.Error("doku: request failed", slog.String("path", path), slog.String("error", doErr.Error()))
		return nil, 0, &domain.Error{Type: domain.InternalServerError, Message: "failed to reach DOKU"}
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, 0, &domain.Error{Type: domain.InternalServerError, Message: "failed to read DOKU response"}
	}

	return respBody, resp.StatusCode, nil
}

// doSignedRequest is send with the access-token lookup, JSON encoding and
// the one-retry-on-401 policy (FR-3: "refetched once on a 401") layered on
// top, shared by every transactional call.
func (c *Client) doSignedRequest(ctx context.Context, path string, requestBody any) ([]byte, *domain.Error) {
	token, tokenErr := c.getAccessToken(ctx)
	if tokenErr != nil {
		return nil, tokenErr
	}

	body, marshalErr := json.Marshal(requestBody)
	if marshalErr != nil {
		return nil, &domain.Error{Type: domain.InternalServerError, Message: "failed to build DOKU request body"}
	}

	respBody, status, sendErr := c.send(ctx, path, body, token)
	if sendErr != nil {
		return nil, sendErr
	}

	if status == http.StatusUnauthorized {
		c.token.invalidate()
		token, tokenErr = c.getAccessToken(ctx)
		if tokenErr != nil {
			return nil, tokenErr
		}
		respBody, status, sendErr = c.send(ctx, path, body, token)
		if sendErr != nil {
			return nil, sendErr
		}
	}

	if status < 200 || status >= 300 {
		c.logger.Error("doku: request rejected", slog.String("path", path), slog.Int("status", status))
		return nil, &domain.Error{Type: domain.InternalServerError, Message: fmt.Sprintf("DOKU request to %s failed with status %d", path, status)}
	}

	return respBody, nil
}
