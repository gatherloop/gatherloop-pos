package doku

import (
	"apps/api/domain"
	"encoding/json"
	"log/slog"
	"strconv"
	"time"
)

// notificationTimestampSkew is D13's window: "a skewed or missing
// X-TIMESTAMP (> 5 min) is rejected".
const notificationTimestampSkew = 5 * time.Minute

// notificationBody is DOKU's inbound payment notification ("What DOKU gives
// us"). It shares its status vocabulary with queryQrisResponse, which is
// why ParseNotification and QueryQris both resolve through
// mapTransactionStatus.
type notificationBody struct {
	OriginalPartnerReferenceNo string     `json:"originalPartnerReferenceNo"`
	OriginalReferenceNo        string     `json:"originalReferenceNo"`
	LatestTransactionStatus    string     `json:"latestTransactionStatus"`
	TransactionStatusDesc      string     `json:"transactionStatusDesc"`
	Amount                     qrisAmount `json:"amount"`
}

// ParseNotification decodes a DOKU payment notification body into a
// QrisStatus. Call VerifyNotificationSignature first — this makes no trust
// decision of its own.
func (c *Client) ParseNotification(body []byte) (domain.QrisStatus, *domain.Error) {
	var parsed notificationBody
	if err := json.Unmarshal(body, &parsed); err != nil {
		return domain.QrisStatus{}, &domain.Error{Type: domain.BadRequest, Message: "invalid DOKU notification body"}
	}
	if parsed.OriginalPartnerReferenceNo == "" {
		return domain.QrisStatus{}, &domain.Error{Type: domain.BadRequest, Message: "DOKU notification is missing originalPartnerReferenceNo"}
	}

	amount, _ := strconv.ParseFloat(parsed.Amount.Value, 32)

	return domain.QrisStatus{
		PartnerReferenceNo: parsed.OriginalPartnerReferenceNo,
		GatewayReferenceNo: parsed.OriginalReferenceNo,
		Status:             mapTransactionStatus(parsed.LatestTransactionStatus),
		PaidAmount:         float32(amount),
		RawStatusCode:      parsed.LatestTransactionStatus,
	}, nil
}

// VerifyNotificationSignature checks a DOKU notification's symmetric
// signature and timestamp freshness (D13). It never logs the signature
// itself, only the outcome and the partner id DOKU sent.
func (c *Client) VerifyNotificationSignature(method, path string, headers domain.NotificationHeaders, body []byte) *domain.Error {
	if headers.Timestamp == "" {
		c.logger.Error("doku: notification rejected", slog.String("reason", "missing X-TIMESTAMP"))
		return &domain.Error{Type: domain.Unauthorized, Message: "missing X-TIMESTAMP"}
	}

	timestamp, parseErr := time.Parse(time.RFC3339Nano, headers.Timestamp)
	if parseErr != nil {
		c.logger.Error("doku: notification rejected", slog.String("reason", "invalid X-TIMESTAMP"))
		return &domain.Error{Type: domain.Unauthorized, Message: "invalid X-TIMESTAMP"}
	}

	if skew := time.Since(timestamp); skew > notificationTimestampSkew || skew < -notificationTimestampSkew {
		c.logger.Error("doku: notification rejected",
			slog.String("reason", "X-TIMESTAMP outside allowed window"),
			slog.String("partnerId", headers.PartnerId),
		)
		return &domain.Error{Type: domain.Unauthorized, Message: "X-TIMESTAMP is outside the allowed window"}
	}

	if headers.Signature == "" {
		c.logger.Error("doku: notification rejected", slog.String("reason", "missing X-SIGNATURE"), slog.String("partnerId", headers.PartnerId))
		return &domain.Error{Type: domain.Unauthorized, Message: "missing X-SIGNATURE"}
	}

	// The notification arrives unauthenticated (no bearer token), so its
	// signature is computed with an empty accessToken segment (D13).
	expected, sigErr := signSymmetric(c.config.ClientSecret, method, path, "", body, headers.Timestamp)
	if sigErr != nil {
		c.logger.Error("doku: failed to compute notification signature", slog.String("error", sigErr.Error()))
		return &domain.Error{Type: domain.InternalServerError, Message: "failed to verify DOKU notification signature"}
	}

	if !equalSignatures(expected, headers.Signature) {
		c.logger.Error("doku: notification signature mismatch", slog.String("partnerId", headers.PartnerId))
		return &domain.Error{Type: domain.Unauthorized, Message: "invalid notification signature"}
	}

	return nil
}
