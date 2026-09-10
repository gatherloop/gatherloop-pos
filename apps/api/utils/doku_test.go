package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The vectors below were generated independently of this package with
// `sha256sum` / `openssl dgst -hmac`, so the tests check this
// implementation against an external oracle rather than against itself.

func TestDokuBodyDigest_MatchesExternalVector(t *testing.T) {
	body := []byte(`{"partnerReferenceNo":"ORD1234567890AB","amount":{"value":"10000.00","currency":"IDR"},"merchantId":"MERCHANT1"}`)

	digest, err := dokuBodyDigest(body)

	require.NoError(t, err)
	assert.Equal(t, "a3eee65799bec6eac2a958da599d03de04786bf846bc970a5079a0b9ad40b9d7", digest)
}

func TestDokuBodyDigest_IgnoresInsignificantWhitespace(t *testing.T) {
	compact := []byte(`{"partnerReferenceNo":"ORD1234567890AB","amount":{"value":"10000.00","currency":"IDR"},"merchantId":"MERCHANT1"}`)
	pretty := []byte(`{
		"partnerReferenceNo": "ORD1234567890AB",
		"amount": {
			"value": "10000.00",
			"currency": "IDR"
		},
		"merchantId": "MERCHANT1"
	}`)

	compactDigest, err := dokuBodyDigest(compact)
	require.NoError(t, err)
	prettyDigest, err := dokuBodyDigest(pretty)
	require.NoError(t, err)

	assert.Equal(t, compactDigest, prettyDigest)
	assert.Equal(t, "a3eee65799bec6eac2a958da599d03de04786bf846bc970a5079a0b9ad40b9d7", prettyDigest)
}

func TestDokuBodyDigest_InvalidJSON(t *testing.T) {
	_, err := dokuBodyDigest([]byte(`not json`))
	assert.Error(t, err)
}

func TestSignDokuSymmetric_MatchesExternalVector(t *testing.T) {
	body := []byte(`{"partnerReferenceNo":"ORD1234567890AB","amount":{"value":"10000.00","currency":"IDR"},"merchantId":"MERCHANT1"}`)

	signature, err := SignDokuSymmetric(
		"test-client-secret",
		"POST",
		"/snap-adapter/b2b/v1.0/qr/qr-mpm-generate",
		"test-access-token",
		body,
		"2021-01-08T09:57:39.000+07:00",
	)

	require.NoError(t, err)
	assert.Equal(t,
		"dPb44R7y98p5vrM8Wa7O1KHInPSV9FmwFYTkEBXIbPnSnbLlj6W+QErkDLZZsP8LZq3W8gsPJRG/03LpSJM4wQ==",
		signature,
	)
}

func TestSignDokuSymmetric_EmptyAccessTokenForNotifications(t *testing.T) {
	// An inbound notification carries no bearer token, so the access-token
	// segment of the string-to-sign is empty (D13) — this must still
	// produce a distinct, well-formed signature, not the same one as an
	// outbound call.
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)

	withToken, err := SignDokuSymmetric("secret", "POST", "/path", "token", body, "2021-01-08T09:57:39.000+07:00")
	require.NoError(t, err)
	withoutToken, err := SignDokuSymmetric("secret", "POST", "/path", "", body, "2021-01-08T09:57:39.000+07:00")
	require.NoError(t, err)

	assert.NotEqual(t, withToken, withoutToken)
}

func TestEqualDokuSignatures(t *testing.T) {
	tests := []struct {
		name     string
		a        string
		b        string
		expected bool
	}{
		{"equal", "AAAA", "AAAA", true},
		{"different", "AAAA", "BBBB", false},
		{"invalid base64 on one side", "not-base64!!", "AAAA", false},
		{"invalid base64 on both sides", "not-base64!!", "also-not-base64!!", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, EqualDokuSignatures(tt.a, tt.b))
		})
	}
}

func TestDokuMinifyJSON(t *testing.T) {
	minified, err := dokuMinifyJSON([]byte(`{  "a" :  1 ,"b":[1,2, 3]  }`))

	require.NoError(t, err)
	assert.Equal(t, `{"a":1,"b":[1,2,3]}`, string(minified))
}
