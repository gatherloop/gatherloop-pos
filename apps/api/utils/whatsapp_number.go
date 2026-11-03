package utils

import "strings"

var whatsappNumberSeparators = strings.NewReplacer(" ", "", "-", "", ".", "", "(", "", ")", "")

// NormalizeWhatsappNumber reduces a guest-typed number to digits only, so the
// stored customer number, the payment snapshot and the Fonnte target match byte for byte.
func NormalizeWhatsappNumber(raw string) (string, bool) {
	stripped := whatsappNumberSeparators.Replace(raw)

	var normalized string
	hasExplicitCountryCode := false
	switch {
	case strings.HasPrefix(stripped, "0"):
		normalized = "62" + stripped[1:]
	case strings.HasPrefix(stripped, "+"):
		normalized = strings.TrimPrefix(stripped, "+")
		hasExplicitCountryCode = true
	default:
		normalized = stripped
	}

	if normalized == "" || !isDigitsOnly(normalized) {
		return "", false
	}

	if strings.HasPrefix(normalized, "62") {
		if len(normalized) < 3 || normalized[2] != '8' {
			return "", false
		}
		if len(normalized) < 10 || len(normalized) > 15 {
			return "", false
		}
		return normalized, true
	}

	if !hasExplicitCountryCode {
		return "", false
	}

	if len(normalized) < 8 || len(normalized) > 15 {
		return "", false
	}

	return normalized, true
}

func isDigitsOnly(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
