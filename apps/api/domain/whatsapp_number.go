package domain

import "strings"

var whatsappNumberSeparators = strings.NewReplacer(" ", "", "-", "", ".", "", "(", "", ")", "")

// NormalizeWhatsappNumber reduces a guest-typed number to digits only, so the
// stored customer number, the payment snapshot and the Fonnte target match byte for byte.
func NormalizeWhatsappNumber(raw string) (string, *Error) {
	stripped := whatsappNumberSeparators.Replace(raw)

	var normalized string
	switch {
	case strings.HasPrefix(stripped, "0"):
		normalized = "62" + stripped[1:]
	case strings.HasPrefix(stripped, "+"):
		normalized = strings.TrimPrefix(stripped, "+")
	default:
		normalized = stripped
	}

	if normalized == "" || !isDigitsOnly(normalized) {
		return "", invalidWhatsappNumberError()
	}

	if strings.HasPrefix(normalized, "62") {
		if len(normalized) < 3 || normalized[2] != '8' {
			return "", invalidWhatsappNumberError()
		}
		if len(normalized) < 10 || len(normalized) > 15 {
			return "", invalidWhatsappNumberError()
		}
		return normalized, nil
	}

	if len(normalized) < 8 || len(normalized) > 15 {
		return "", invalidWhatsappNumberError()
	}

	return normalized, nil
}

func isDigitsOnly(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func invalidWhatsappNumberError() *Error {
	return &Error{
		Type:    BadRequest,
		Message: "customerWhatsappNumber must be a valid WhatsApp number",
		Reason:  ErrorReasonWhatsappNumberInvalid,
	}
}
