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

func dokuMinifyJSON(body []byte) ([]byte, error) {
	var buf bytes.Buffer
	if err := json.Compact(&buf, body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func dokuBodyDigest(body []byte) (string, error) {
	minified, err := dokuMinifyJSON(body)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(minified)
	return strings.ToLower(hex.EncodeToString(sum[:])), nil
}

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

func EqualDokuSignatures(a, b string) bool {
	aBytes, aErr := base64.StdEncoding.DecodeString(a)
	bBytes, bErr := base64.StdEncoding.DecodeString(b)
	if aErr != nil || bErr != nil {
		return false
	}
	return hmac.Equal(aBytes, bBytes)
}
