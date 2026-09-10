package utils

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"strings"
)

// dokuMinifyJSON removes insignificant whitespace without reordering keys —
// the "minify(RequestBody)" step of DOKU's symmetric signature scheme.
func dokuMinifyJSON(body []byte) ([]byte, error) {
	var buf bytes.Buffer
	if err := json.Compact(&buf, body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// dokuBodyDigest is Lowercase(HexEncode(SHA-256(minify(body)))).
func dokuBodyDigest(body []byte) (string, error) {
	minified, err := dokuMinifyJSON(body)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(minified)
	return strings.ToLower(hex.EncodeToString(sum[:])), nil
}

// SignDokuSymmetric implements DOKU's SNAP HMAC-SHA512 transactional
// signature, shared by data/doku (signing our own outbound qr-mpm-generate
// / qr-mpm-query calls) and the VerifyDokuSignature middleware (recomputing
// an inbound notification's signature, with an empty accessToken since DOKU
// sends notifications unauthenticated):
//
//	stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" +
//	    Lowercase(HexEncode(SHA-256(minify(RequestBody)))) + ":" + TimeStamp
func SignDokuSymmetric(clientSecret, method, path, accessToken string, body []byte, timestamp string) (string, error) {
	digest, err := dokuBodyDigest(body)
	if err != nil {
		return "", err
	}
	stringToSign := method + ":" + path + ":" + accessToken + ":" + digest + ":" + timestamp
	mac := hmac.New(sha512.New, []byte(clientSecret))
	mac.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil)), nil
}

// EqualDokuSignatures compares two base64-encoded signatures for equality
// in constant time (D13). An undecodable signature is never equal to
// anything.
func EqualDokuSignatures(a, b string) bool {
	aBytes, aErr := base64.StdEncoding.DecodeString(a)
	bBytes, bErr := base64.StdEncoding.DecodeString(b)
	if aErr != nil || bErr != nil {
		return false
	}
	return hmac.Equal(aBytes, bBytes)
}
