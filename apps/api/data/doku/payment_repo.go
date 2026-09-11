package doku

import (
	"apps/api/domain"
	"apps/api/utils"
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
	"strings"
	"time"
)

const (
	tokenPath      = "/authorization/v1/access-token/b2b"
	qrGeneratePath = "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate"
	qrQueryPath    = "/snap-adapter/b2b/v1.0/qr/qr-mpm-query"

	qrisServiceCode = "47"

	requestTimeout = 10 * time.Second
)

var dokuTimeZone = time.FixedZone("WIB", 7*60*60)

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

func NewPaymentGatewayRepository(config Config) domain.PaymentGatewayRepository {
	return NewClient(config)
}

func NewClient(config Config) *Client {
	config.BaseURL = strings.TrimRight(config.BaseURL, "/")
	return &Client{
		config:     config,
		httpClient: &http.Client{Timeout: requestTimeout},
		token:      &tokenCache{},
		logger:     slog.Default(),
	}
}

// DOKU issues QRIS credentials for the live environment only, so qr-mpm-generate
// answers 5004701 on api-sandbox.doku.com however valid the request is.
func IsSandboxBaseURL(baseURL string) bool {
	return strings.Contains(baseURL, "sandbox.doku.com")
}

func (c *Client) VerifyCredentials(ctx context.Context) *domain.Error {
	_, err := c.fetchAccessToken(ctx)
	return err
}

func ParsePrivateKeyPEM(pemStr string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(normalizePrivateKeyPEM(pemStr)))
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

// .env and systemd EnvironmentFile can both hand over the PEM still quoted and with its newlines escaped.
func normalizePrivateKeyPEM(pemStr string) string {
	normalized := strings.TrimSpace(pemStr)
	normalized = strings.Trim(normalized, `"'`)
	normalized = strings.ReplaceAll(normalized, `\n`, "\n")
	return strings.TrimSpace(normalized)
}

func maskCredential(value string) string {
	if value == "" {
		return "<empty>"
	}
	if len(value) <= 4 {
		return "****"
	}
	return "****" + value[len(value)-4:]
}

// DOKU wants a numeric offset (2022-10-07T14:26:50+07:00), never the "Z" a UTC host would render.
func formatTimestamp(t time.Time) string {
	return t.In(dokuTimeZone).Format("2006-01-02T15:04:05-07:00")
}

func formatValidityPeriod(expiredAt time.Time) string {
	if expiredAt.IsZero() {
		return ""
	}
	return formatTimestamp(expiredAt)
}

func formatAmount(amount float32) string {
	return strconv.FormatFloat(float64(amount), 'f', 2, 32)
}

const maxFailureDetailLength = 512

type failureResponse struct {
	ResponseCode    string `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
}

func describeFailure(body []byte) string {
	var parsed failureResponse
	if json.Unmarshal(body, &parsed) == nil && (parsed.ResponseCode != "" || parsed.ResponseMessage != "") {
		return strings.TrimSpace(parsed.ResponseCode + " " + parsed.ResponseMessage)
	}

	raw := strings.TrimSpace(string(body))
	if raw == "" {
		return "<empty response body>"
	}
	if len(raw) > maxFailureDetailLength {
		return raw[:maxFailureDetailLength] + "..."
	}
	return raw
}

func isSuccessResponseCode(code string) bool {
	return len(code) >= 3 && code[:3] == "200"
}

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

func (c *Client) send(ctx context.Context, path string, body []byte, accessToken string) ([]byte, int, *domain.Error) {
	timestamp := formatTimestamp(time.Now())
	signature, sigErr := utils.SignDokuSymmetric(c.config.ClientSecret, http.MethodPost, path, accessToken, body, timestamp)
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
		detail := describeFailure(respBody)
		c.logger.Error("doku: request rejected",
			slog.String("path", path),
			slog.Int("status", status),
			slog.String("response", detail),
		)
		return nil, &domain.Error{Type: domain.InternalServerError, Message: fmt.Sprintf("DOKU request to %s failed with status %d: %s", path, status, detail)}
	}

	return respBody, nil
}

type qrisAmount struct {
	Value    string `json:"value"`
	Currency string `json:"currency"`
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
	ResponseCode               string     `json:"responseCode"`
	ResponseMessage            string     `json:"responseMessage"`
	OriginalPartnerReferenceNo string     `json:"originalPartnerReferenceNo"`
	OriginalReferenceNo        string     `json:"originalReferenceNo"`
	LatestTransactionStatus    string     `json:"latestTransactionStatus"`
	TransactionStatusDesc      string     `json:"transactionStatusDesc"`
	Amount                     qrisAmount `json:"amount"`
}

func (c *Client) GenerateQris(ctx context.Context, input domain.GenerateQrisInput) (domain.QrisPayment, *domain.Error) {
	reqBody := generateQrisRequest{
		PartnerReferenceNo: input.PartnerReferenceNo,
		Amount:             qrisAmount{Value: formatAmount(input.Amount), Currency: "IDR"},
		MerchantId:         c.config.MerchantId,
		TerminalId:         c.config.TerminalId,
		ValidityPeriod:     formatValidityPeriod(input.ExpiredAt),
		AdditionalInfo: qrisAdditionalInfo{
			PostalCode: c.config.PostalCode,
			FeeType:    c.config.FeeType,
		},
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
		return domain.QrisPayment{}, &domain.Error{Type: domain.InternalServerError, Message: fmt.Sprintf("DOKU rejected the QRIS generation request: %s", strings.TrimSpace(parsed.ResponseCode+" "+parsed.ResponseMessage))}
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

func generateExternalId() string {
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}
