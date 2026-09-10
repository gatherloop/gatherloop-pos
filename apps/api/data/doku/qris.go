package doku

import (
	"apps/api/domain"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"
)

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
	status := mapTransactionStatus(parsed.LatestTransactionStatus)

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

// generateExternalId produces the numeric, within-the-day-unique X-EXTERNAL-ID
// SNAP requires on every transactional call. Nanosecond resolution makes a
// collision within one day practically impossible without needing a shared
// counter across requests.
func generateExternalId() string {
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}
