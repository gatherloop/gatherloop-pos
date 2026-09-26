package domain

import (
	"net/http"
	"time"
)

// codVerificationPhotoMaxBytes bounds the decoded photo (D13): ~4x the expected size after the
// client's canvas downscale (FR-7), enough headroom without accepting an arbitrary upload.
const codVerificationPhotoMaxBytes = 1024 * 1024

var allowedVerificationPhotoContentTypes = map[string]bool{
	"image/jpeg": true,
	"image/webp": true,
}

// PaymentVerificationPhoto is the COD presence photo (D4): stored only for as long as its payment
// is cod + pending + awaiting (D5), hard-deleted in the same transaction as the barista's decision.
type PaymentVerificationPhoto struct {
	PaymentId   int64
	ContentType string
	ByteSize    int
	Data        []byte
	CreatedAt   time.Time
}

// ValidateVerificationPhoto enforces FR-2's photo gate on decoded bytes: non-empty, within the
// size cap, and sniffed (never client-asserted) as JPEG or WebP. It returns the sniffed content
// type so the caller does not have to detect it a second time when building the stored row.
func ValidateVerificationPhoto(data []byte) (string, *Error) {
	if len(data) == 0 {
		return "", &Error{Type: BadRequest, Message: "verification photo is empty"}
	}

	if len(data) > codVerificationPhotoMaxBytes {
		return "", &Error{Type: BadRequest, Message: "verification photo is too large"}
	}

	contentType := http.DetectContentType(data)
	if !allowedVerificationPhotoContentTypes[contentType] {
		return "", &Error{Type: BadRequest, Message: "verification photo must be a JPEG or WebP image"}
	}

	return contentType, nil
}
