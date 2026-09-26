package restapi

import (
	"apps/api/domain"
	"encoding/base64"
	apiContract "libs/api-contract"
)

// ToApiTransactionVerification is D14: the photo travels as a data URL, staff-only, never in a
// guest or list response.
func ToApiTransactionVerification(photo domain.PaymentVerificationPhoto) apiContract.TransactionVerification {
	return apiContract.TransactionVerification{
		Photo:      "data:" + photo.ContentType + ";base64," + base64.StdEncoding.EncodeToString(photo.Data),
		CapturedAt: photo.CreatedAt,
	}
}
