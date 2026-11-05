package expopush

import (
	"apps/api/domain"
	"strings"
)

func toPushMessageRequest(message domain.KdsPushMessage) pushMessageRequest {
	return pushMessageRequest{
		To:        message.To,
		Title:     message.Title,
		Body:      message.Body,
		Sound:     message.Sound,
		ChannelId: message.ChannelId,
		Priority:  message.Priority,
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
