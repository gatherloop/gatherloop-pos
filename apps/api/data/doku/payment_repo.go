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

	requestTimeout = 10 * time.Second

	// notificationTimestampSkew is D13's window: "a skewed or missing
	// X-TIMESTAMP (> 5 min) is rejected".
	notificationTimestampSkew = 5 * time.Minute
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

// Client implements domain.PaymentGatewayRepository. Its access-token
// lifecycle lives in token.go and its signature schemes in signature.go —
// both are shared infrastructure this file's methods call into, in the
// same spirit as data/mysql's base_repo.go.
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
func MapTransactionStatus(code string) domain.PaymentGatewayStatus {
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

// qrisAmount is DOKU's SNAP amount object — a decimal-string value plus an
// ISO currency code, never a bare number.
type qrisAmount struct {
	Value    string `json:"value"`
	Currency string `json:"currency"`
}

type generateQrisRequest struct {
	PartnerReferenceNo string     `json:"partnerReferenceNo"`
	Amount             qrisAmount `json:"amount"`
	MerchantId         string     `json:"merchantId"`
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
	ResponseCode               string     `json:"responseCode"`
	ResponseMessage            string     `json:"responseMessage"`
	OriginalPartnerReferenceNo string     `json:"originalPartnerReferenceNo"`
	OriginalReferenceNo        string     `json:"originalReferenceNo"`
	LatestTransactionStatus    string     `json:"latestTransactionStatus"`
	TransactionStatusDesc      string     `json:"transactionStatusDesc"`
	Amount                     qrisAmount `json:"amount"`
}

// GenerateQris calls qr-mpm-generate to mint a dynamic QRIS QR for one
// partner reference number (FR-3, D3).
func (c *Client) GenerateQris(ctx context.Context, input domain.GenerateQrisInput) (domain.QrisPayment, *domain.Error) {
	reqBody := generateQrisRequest{
		PartnerReferenceNo: input.PartnerReferenceNo,
		Amount:             qrisAmount{Value: formatAmount(input.Amount), Currency: "IDR"},
		MerchantId:         c.config.MerchantId,
	}

	respBody, err := c.doSignedRequest(ctx, qrGeneratePath, reqBody)
	if err != nil {
		c.logger.Error("doku: generate qris failed", slog.String("partnerReferenceNo", input.PartnerReferenceNo), slog.String("error", err.Message))
		return domain.QrisPayment{}, err
	}

	var parsed generateQrisResponse
	if jsonErr := json.Unmarshal(respBody, &parsed); jsonErr != nil {
		c.logger.Error("doku: failed to parse generate qris response", slog.String("partnerReferenceNo", input.PartnerReferenceNo))
		return domain.QrisPayment{}, &domain.Error{Type: domain.InternalServerError, Message: "failed to parse DOKU generate QRIS response"}
	}

	if !isSuccessResponseCode(parsed.ResponseCode) {
		c.logger.Error("doku: generate qris rejected",
			slog.String("partnerReferenceNo", input.PartnerReferenceNo),
			slog.String("responseCode", parsed.ResponseCode),
		)
		return domain.QrisPayment{}, &domain.Error{Type: domain.InternalServerError, Message: fmt.Sprintf("DOKU rejected the QRIS generation request: %s", parsed.ResponseMessage)}
	}

	c.logger.Info("doku: generated qris",
		slog.String("partnerReferenceNo", input.PartnerReferenceNo),
		slog.String("referenceNo", parsed.ReferenceNo),
	)

	return domain.QrisPayment{
		PartnerReferenceNo: parsed.PartnerReferenceNo,
		GatewayReferenceNo: parsed.ReferenceNo,
		QrContent:          parsed.QrContent,
		ExpiredAt:          input.ExpiredAt,
	}, nil
}

// QueryQris calls qr-mpm-query to ask DOKU for a payment's current status
// (D12, D12a).
func (c *Client) QueryQris(ctx context.Context, input domain.QueryQrisInput) (domain.QrisStatus, *domain.Error) {
	reqBody := queryQrisRequest{
		OriginalPartnerReferenceNo: input.PartnerReferenceNo,
		OriginalReferenceNo:        input.GatewayReferenceNo,
		MerchantId:                 c.config.MerchantId,
		ServiceCode:                qrisServiceCode,
	}

	respBody, err := c.doSignedRequest(ctx, qrQueryPath, reqBody)
	if err != nil {
		c.logger.Error("doku: query qris failed", slog.String("partnerReferenceNo", input.PartnerReferenceNo), slog.String("error", err.Message))
		return domain.QrisStatus{}, err
	}

	var parsed queryQrisResponse
	if jsonErr := json.Unmarshal(respBody, &parsed); jsonErr != nil {
		c.logger.Error("doku: failed to parse query qris response", slog.String("partnerReferenceNo", input.PartnerReferenceNo))
		return domain.QrisStatus{}, &domain.Error{Type: domain.InternalServerError, Message: "failed to parse DOKU query QRIS response"}
	}

	if !isSuccessResponseCode(parsed.ResponseCode) {
		// A non-success responseCode on a status query is not itself proof
		// of anything about the payment — never optimistically paid, and
		// never treated as a hard failure either. It resolves to pending
		// and the next poll or notification tries again.
		c.logger.Warn("doku: query qris non-success response",
			slog.String("partnerReferenceNo", input.PartnerReferenceNo),
			slog.String("responseCode", parsed.ResponseCode),
		)
		return domain.QrisStatus{
			PartnerReferenceNo: input.PartnerReferenceNo,
			GatewayReferenceNo: input.GatewayReferenceNo,
			Status:             domain.PaymentGatewayStatusPending,
			RawStatusCode:      parsed.ResponseCode,
		}, nil
	}

	amount, _ := strconv.ParseFloat(parsed.Amount.Value, 32)
	status := MapTransactionStatus(parsed.LatestTransactionStatus)

	c.logger.Info("doku: queried qris",
		slog.String("partnerReferenceNo", input.PartnerReferenceNo),
		slog.String("status", string(status)),
	)

	return domain.QrisStatus{
		PartnerReferenceNo: parsed.OriginalPartnerReferenceNo,
		GatewayReferenceNo: parsed.OriginalReferenceNo,
		Status:             status,
		PaidAmount:         float32(amount),
		RawStatusCode:      parsed.LatestTransactionStatus,
	}, nil
}

// VerifyNotificationSignature checks a DOKU notification's symmetric
// signature and timestamp freshness (D13). It is a free function, not a
// Client method: verifying an inbound notification needs only the client
// secret, not a full Client (its HTTP client, base URL, token cache) — so
// the presentation layer's VerifyDokuSignature middleware can call it
// directly with the secret from env, without depending on the whole
// PaymentGatewayRepository port.
func VerifyNotificationSignature(clientSecret, method, path string, headers domain.NotificationHeaders, body []byte) *domain.Error {
	if headers.Timestamp == "" {
		return &domain.Error{Type: domain.Unauthorized, Message: "missing X-TIMESTAMP"}
	}

	timestamp, parseErr := time.Parse(time.RFC3339Nano, headers.Timestamp)
	if parseErr != nil {
		return &domain.Error{Type: domain.Unauthorized, Message: "invalid X-TIMESTAMP"}
	}

	if skew := time.Since(timestamp); skew > notificationTimestampSkew || skew < -notificationTimestampSkew {
		return &domain.Error{Type: domain.Unauthorized, Message: "X-TIMESTAMP is outside the allowed window"}
	}

	if headers.Signature == "" {
		return &domain.Error{Type: domain.Unauthorized, Message: "missing X-SIGNATURE"}
	}

	// The notification arrives unauthenticated (no bearer token), so its
	// signature is computed with an empty accessToken segment (D13).
	expected, sigErr := signSymmetric(clientSecret, method, path, "", body, headers.Timestamp)
	if sigErr != nil {
		return &domain.Error{Type: domain.InternalServerError, Message: "failed to verify DOKU notification signature"}
	}

	if !equalSignatures(expected, headers.Signature) {
		return &domain.Error{Type: domain.Unauthorized, Message: "invalid notification signature"}
	}

	return nil
}

// generateExternalId produces the numeric, within-the-day-unique X-EXTERNAL-ID
// SNAP requires on every transactional call. Nanosecond resolution makes a
// collision within one day practically impossible without needing a shared
// counter across requests.
func generateExternalId() string {
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}
