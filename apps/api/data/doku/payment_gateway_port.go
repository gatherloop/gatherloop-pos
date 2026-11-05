package doku

import (
	"apps/api/domain"
	"apps/api/utils"
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
	tokenPath      = "/authorization/v1/access-token/b2b"
	qrGeneratePath = "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate"
	qrQueryPath    = "/snap-adapter/b2b/v1.0/qr/qr-mpm-query"
	qrCancelPath   = "/snap-adapter/b2b/v1.0/qr/qr-expire"

	qrisServiceCode = "47"

	requestTimeout = 10 * time.Second
)

func NewPaymentGatewayPort(config Config) domain.PaymentGatewayPort {
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

func (c *Client) VerifyCredentials(ctx context.Context) *domain.Error {
	_, err := c.fetchAccessToken(ctx)
	return err
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
		c.logger.Error("doku: failed to parse query qris response", slog.String("partnerReferenceNo", input.PartnerReferenceNo), slog.String("error", jsonErr.Error()))
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

	amount := parsed.Amount.Value
	status := ToPaymentGatewayStatus(parsed.LatestTransactionStatus)

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

func (c *Client) CancelQris(ctx context.Context, input domain.CancelQrisInput) *domain.Error {
	reqBody := cancelQrisRequest{
		PartnerReferenceNo: input.PartnerReferenceNo,
		ReferenceNo:        input.GatewayReferenceNo,
		MerchantId:         c.config.MerchantId,
		Reason:             "guest cancelled the order",
	}

	respBody, err := c.doSignedRequest(ctx, qrCancelPath, reqBody)
	if err != nil {
		c.logger.Warn("doku: cancel qris failed", slog.String("partnerReferenceNo", input.PartnerReferenceNo), slog.String("error", err.Message))
		return err
	}

	var parsed cancelQrisResponse
	if jsonErr := json.Unmarshal(respBody, &parsed); jsonErr != nil {
		c.logger.Warn("doku: failed to parse cancel qris response", slog.String("partnerReferenceNo", input.PartnerReferenceNo), slog.String("error", jsonErr.Error()))
		return &domain.Error{Type: domain.InternalServerError, Message: "failed to parse DOKU cancel QRIS response"}
	}

	if !isSuccessResponseCode(parsed.ResponseCode) {
		c.logger.Warn("doku: cancel qris rejected",
			slog.String("partnerReferenceNo", input.PartnerReferenceNo),
			slog.String("responseCode", parsed.ResponseCode),
		)
		return &domain.Error{Type: domain.InternalServerError, Message: fmt.Sprintf("DOKU rejected the QRIS cancel request: %s", strings.TrimSpace(parsed.ResponseCode+" "+parsed.ResponseMessage))}
	}

	c.logger.Info("doku: cancelled qris",
		slog.String("partnerReferenceNo", input.PartnerReferenceNo),
		slog.String("referenceNo", parsed.ReferenceNo),
	)

	return nil
}
