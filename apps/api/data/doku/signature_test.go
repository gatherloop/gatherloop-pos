package doku

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testPrivateKeyPEM and the vectors below were generated independently of
// this package with `openssl genrsa` / `openssl dgst -sign` and
// `sha256sum` / `openssl dgst -hmac`, so the tests check this
// implementation against an external oracle rather than against itself.
const testPrivateKeyPEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6r6NZOHR/S16h
UpNx6jnN1m22sIz8ejBRv8Bee8IuYl5CFw0596f8tgJzo7kss5UkDnuYWTBLVlHI
7h02tibT7VsEvGWclYkwvRJooKQl7SvwAqkHpM/MKca3Rj2ifw+eU5eJt+qMynwM
tWwcfXqWTFHPwA8qceYdYMjJXNfBmSusLHXSFsGwGr+jdUvmpaCU7+fRDFnJZkKe
Qs5olpPs4osi12XvNyr3uTkAaxfY49tpB1K7D1X8dSAQvayoLoA3yxcYUsz8QbRu
TWy5NnqMu21Ep1e43loSpEa5BD5Jtrz/+y1fB35uf5mJEO+5ZlFInlN9MWzjOhU4
pc/pKNuzAgMBAAECggEAIqPRgw4jK7WP/w4j9si35hZKMFJtLrH7gke6ya1cGCA/
jjLZzO5DuPQK22s/QmimHVUkoN23xNrk/QwV1p+Q79UEhQnyLs5ecPE8V7arDrCF
7RiJRbZSqnb7/OjnKd46xy2Kmk7KkkpGH1OQlm7ADuBlc8+W4NDWmo/pYde83xqc
Kqk16vRNoc/CKRH/bM4URsb5scQ9lw9lVHWEoZ85+nZ9fhcee68D6TZ50P9D0Jj9
OtRSevF0/zKZAP8xzFyvyBMh2hl5Kw+md5Jl7zJuSUbqsuMyXGPYx0ldTi7HH2Eh
Bwh0YHvhjQQo/Vyeidw/goKEKCcuYMlVSCILSmyM1QKBgQDcYTsB5TQT/JYWYozx
KoEraVo8uUtrOh8ATsyK44OCas2QnYgEDhjkk9deTs99tqWIsp9Z6Q8/Ofss0Ob/
VI04psjrzPzQ5eAUlwtHTQmmJIbwZSsvJoFNfEB/2FhMy756FnbDirfcUOw5cvfC
J7vnau0wXpylz+gj/S6MLGlEHwKBgQDY3D67cfsImbCjjVfgUrRdqJBM/H4zZzTk
x8wMPCTFVA2MWuuFkPa0x+QbL7osV1cStVzsfSm9t80XA6sgEXGNW6pE3gc8JbCW
xfz9siS8VHmqFfVpUzxB61dVVXx0Y33rxoeSs+AZq7EUSfpnBQtcEleELNDI+Ib7
FdGGkRnV7QKBgEA0+9Ijiza/gqLm95VUAuo4+ZdzjOuitWGLk8BrZOdcYqPdocE8
sjf2cusBHybLThMzp4W0h0Kui+WUv5hoc/SrcyJwSMA8GTsmfpy5bzQ+tCnZ7+j+
2PFQYCJfT+qf+dDsNpHmGodP9GMQgerJVM+psY1EI3OTzVie7S7dyZWVAoGANTmR
OAZYm5rFDM9DEy6ZUCdwC0UpYEpjZAdZoGMej0P680jZZ3XV5zbsWHPVWM6y80eK
IAz0Mrkq4Awpcvx1B0HJP4/S7MM/XTIIzudrNsHw/nrXOduQ/YjabXpGynYk0Lpw
SeRWC1blZlpl1+UYDaf+zNUHBVxiHLwVKdbxJV0CgYEAjZ8sLnSxtn2c0Y3G7ohR
Fi1KrGVecoSkH6Aj8tPP4dT3f4Q32M5kY8gWGeUxdir63TvslyAMQaMNYf/5jWQq
fIZ/BRMoLZ3JvZfr2Jk+e8eDkjEvutLu5OZZx+apxiJ9+YvCIowj67p/CcE+dQqi
tcYgNosxGomOnkGNRcgj9UU=
-----END PRIVATE KEY-----`

func mustParseTestPrivateKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	block, _ := pem.Decode([]byte(testPrivateKeyPEM))
	require.NotNil(t, block)
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	require.NoError(t, err)
	rsaKey, ok := key.(*rsa.PrivateKey)
	require.True(t, ok)
	return rsaKey
}

func TestSignAsymmetric_MatchesExternalVector(t *testing.T) {
	key := mustParseTestPrivateKey(t)

	signature, err := signAsymmetric(key, "test-client-id", "2021-01-08T09:57:39.000+07:00")

	require.NoError(t, err)
	assert.Equal(t,
		"VGOvFSZkZuzmfGcxlL2LNFO9mjz+jbPBSzNbqms7o2L4PKbu6fQfKR0O9i5/cqCEw7lnzYzvk4iSKO7HijvParPz0VusC3o19thtghtQafxEV1K6uF1TWDO+IdFp/a4UNEJkWhPosjDZh7lVzsBwFzYEWLPnX3VCzZU8ldmrnuHN5cAz9cPS7ZlRlHsdUZvOTL5yqmOmLNU0EPdebMVTE59wuyCW40qaR5H+RAty0ih35D3+xZVn6Zl0dV3iH30g2r9Xgt/3AfhzQSa/YlvB5Xw2bh55aNC/AHMiDtFgXGAs7LLdhhC2Z8QOEbihISOb3v1GXf5z2cKevyttcSu9EA==",
		signature,
	)
}

func TestSignAsymmetric_NoPrivateKey(t *testing.T) {
	_, err := signAsymmetric(nil, "test-client-id", "2021-01-08T09:57:39.000+07:00")
	assert.Error(t, err)
}

func TestBodyDigest_MatchesExternalVector(t *testing.T) {
	body := []byte(`{"partnerReferenceNo":"ORD1234567890AB","amount":{"value":"10000.00","currency":"IDR"},"merchantId":"MERCHANT1"}`)

	digest, err := bodyDigest(body)

	require.NoError(t, err)
	assert.Equal(t, "a3eee65799bec6eac2a958da599d03de04786bf846bc970a5079a0b9ad40b9d7", digest)
}

func TestBodyDigest_IgnoresInsignificantWhitespace(t *testing.T) {
	compact := []byte(`{"partnerReferenceNo":"ORD1234567890AB","amount":{"value":"10000.00","currency":"IDR"},"merchantId":"MERCHANT1"}`)
	pretty := []byte(`{
		"partnerReferenceNo": "ORD1234567890AB",
		"amount": {
			"value": "10000.00",
			"currency": "IDR"
		},
		"merchantId": "MERCHANT1"
	}`)

	compactDigest, err := bodyDigest(compact)
	require.NoError(t, err)
	prettyDigest, err := bodyDigest(pretty)
	require.NoError(t, err)

	assert.Equal(t, compactDigest, prettyDigest)
	assert.Equal(t, "a3eee65799bec6eac2a958da599d03de04786bf846bc970a5079a0b9ad40b9d7", prettyDigest)
}

func TestBodyDigest_InvalidJSON(t *testing.T) {
	_, err := bodyDigest([]byte(`not json`))
	assert.Error(t, err)
}

func TestSignSymmetric_MatchesExternalVector(t *testing.T) {
	body := []byte(`{"partnerReferenceNo":"ORD1234567890AB","amount":{"value":"10000.00","currency":"IDR"},"merchantId":"MERCHANT1"}`)

	signature, err := signSymmetric(
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

func TestSignSymmetric_EmptyAccessTokenForNotifications(t *testing.T) {
	// An inbound notification carries no bearer token, so the access-token
	// segment of the string-to-sign is empty (D13) — this must still
	// produce a distinct, well-formed signature, not the same one as an
	// outbound call.
	body := []byte(`{"originalPartnerReferenceNo":"ORD1"}`)

	withToken, err := signSymmetric("secret", "POST", "/path", "token", body, "2021-01-08T09:57:39.000+07:00")
	require.NoError(t, err)
	withoutToken, err := signSymmetric("secret", "POST", "/path", "", body, "2021-01-08T09:57:39.000+07:00")
	require.NoError(t, err)

	assert.NotEqual(t, withToken, withoutToken)
}

func TestEqualSignatures(t *testing.T) {
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
			assert.Equal(t, tt.expected, equalSignatures(tt.a, tt.b))
		})
	}
}

func TestMinifyJSON(t *testing.T) {
	minified, err := minifyJSON([]byte(`{  "a" :  1 ,"b":[1,2, 3]  }`))

	require.NoError(t, err)
	assert.Equal(t, `{"a":1,"b":[1,2,3]}`, string(minified))
}
