package domain_test

import (
	"apps/api/domain"
	"bytes"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var jpegMagicBytes = []byte{0xFF, 0xD8, 0xFF}
var pngMagicBytes = []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}

func webpBytes(size int) []byte {
	data := bytes.Repeat([]byte{0}, size)
	copy(data, []byte("RIFF"))
	copy(data[8:], []byte("WEBPVP"))
	return data
}

func TestValidateVerificationPhoto_AcceptsJpegWithinTheSizeCap(t *testing.T) {
	data := append(append([]byte{}, jpegMagicBytes...), bytes.Repeat([]byte{0}, 100)...)

	contentType, err := domain.ValidateVerificationPhoto(data)

	require.Nil(t, err)
	assert.Equal(t, "image/jpeg", contentType)
}

func TestValidateVerificationPhoto_AcceptsWebpWithinTheSizeCap(t *testing.T) {
	data := webpBytes(100)

	contentType, err := domain.ValidateVerificationPhoto(data)

	require.Nil(t, err)
	assert.Equal(t, "image/webp", contentType)
}

func TestValidateVerificationPhoto_RejectsEmptyInput(t *testing.T) {
	_, err := domain.ValidateVerificationPhoto([]byte{})

	require.NotNil(t, err)
	assert.Equal(t, domain.BadRequest, err.Type)
}

func TestValidateVerificationPhoto_RejectsOversizePhoto(t *testing.T) {
	data := append(append([]byte{}, jpegMagicBytes...), bytes.Repeat([]byte{0}, 1024*1024)...)

	_, err := domain.ValidateVerificationPhoto(data)

	require.NotNil(t, err)
	assert.Equal(t, domain.BadRequest, err.Type)
}

// A guest could rename a PNG to look like a JPEG, or a client bug could mislabel the content
// type — ValidateVerificationPhoto sniffs the actual bytes rather than trusting either.
func TestValidateVerificationPhoto_RejectsAPngDisguisedAsAJpeg(t *testing.T) {
	data := append(append([]byte{}, pngMagicBytes...), bytes.Repeat([]byte{0}, 100)...)

	_, err := domain.ValidateVerificationPhoto(data)

	require.NotNil(t, err)
	assert.Equal(t, domain.BadRequest, err.Type)
}
