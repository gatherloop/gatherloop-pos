package domain

import (
	"net/http"
	"time"
)

const codVerificationPhotoMaxBytes = 1024 * 1024

var allowedVerificationPhotoContentTypes = map[string]bool{
	"image/jpeg": true,
	"image/webp": true,
}

type PaymentVerificationPhoto struct {
	PaymentId   int64
	ContentType string
	ByteSize    int
	Data        []byte
	CreatedAt   time.Time
}

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
