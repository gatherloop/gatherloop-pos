package fonnte

import (
	"apps/api/domain"
	"bytes"
	"errors"
	"fmt"
	"mime/multipart"
	"net"
	"strings"
)

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

func unknownOutcome(detail string) domain.WhatsAppSendResult {
	return domain.WhatsAppSendResult{
		Outcome: domain.WhatsAppSendOutcomeUnknown,
		Detail:  fmt.Sprintf("outcome unknown: %s", detail),
	}
}

func unknownValidationOutcome(detail string) domain.WhatsAppNumberValidationResult {
	return domain.WhatsAppNumberValidationResult{
		Status: domain.WhatsAppNumberStatusUnknown,
		Detail: fmt.Sprintf("outcome unknown: %s", detail),
	}
}

func isDialError(err error) bool {
	var opErr *net.OpError
	return errors.As(err, &opErr) && opErr.Op == "dial"
}

func mapRequestError(err error) domain.WhatsAppSendResult {
	if isDialError(err) {
		return domain.WhatsAppSendResult{Outcome: domain.WhatsAppSendOutcomeRejected, Detail: err.Error()}
	}
	return unknownOutcome(err.Error())
}

func buildMultipartBody(fields map[string]string) (*bytes.Buffer, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for field, value := range fields {
		if err := writer.WriteField(field, value); err != nil {
			return nil, "", err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, "", err
	}

	return body, writer.FormDataContentType(), nil
}

func buildRequestBody(message domain.WhatsAppMessage) (*bytes.Buffer, string, error) {
	return buildMultipartBody(map[string]string{
		"target":      message.To,
		"message":     message.Body,
		"countryCode": countryCodeAlreadyNorm,
	})
}
