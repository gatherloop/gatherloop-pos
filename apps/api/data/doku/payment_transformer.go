package doku

import (
	"apps/api/domain"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func ToPaymentGatewayStatus(code string) domain.PaymentGatewayStatus {
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

var dokuTimeZone = time.FixedZone("WIB", 7*60*60)

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

func generateExternalId() string {
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}
