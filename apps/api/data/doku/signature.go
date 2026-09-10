package doku

import (
	"bytes"
	"crypto"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
)

// signAsymmetric implements DOKU's B2B access-token signature: SHA256withRSA
// over `clientId + "|" + timestamp`, base64-encoded ("What DOKU gives us").
func signAsymmetric(privateKey *rsa.PrivateKey, clientId, timestamp string) (string, error) {
	if privateKey == nil {
		return "", fmt.Errorf("doku: no private key configured")
	}
	digest := sha256.Sum256([]byte(clientId + "|" + timestamp))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

// minifyJSON removes insignificant whitespace without reordering keys —
// the "minify(RequestBody)" step of DOKU's symmetric signature scheme.
func minifyJSON(body []byte) ([]byte, error) {
	var buf bytes.Buffer
	if err := json.Compact(&buf, body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// bodyDigest is Lowercase(HexEncode(SHA-256(minify(body)))).
func bodyDigest(body []byte) (string, error) {
	minified, err := minifyJSON(body)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(minified)
	return strings.ToLower(hex.EncodeToString(sum[:])), nil
}

// symmetricStringToSign builds DOKU's transactional string-to-sign:
//
//	HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" +
//	Lowercase(HexEncode(SHA-256(minify(RequestBody)))) + ":" + TimeStamp
//
// accessToken is the empty string for an inbound notification, which DOKU
// sends unauthenticated — there is no bearer token to include (D13).
func symmetricStringToSign(method, path, accessToken, digest, timestamp string) string {
	return method + ":" + path + ":" + accessToken + ":" + digest + ":" + timestamp
}

// signSymmetric implements DOKU's HMAC-SHA512 transactional signature,
// used both to sign our outbound qr-mpm-generate / qr-mpm-query calls and,
// with an empty accessToken, to recompute an inbound notification's
// signature for verification.
func signSymmetric(clientSecret, method, path, accessToken string, body []byte, timestamp string) (string, error) {
	digest, err := bodyDigest(body)
	if err != nil {
		return "", err
	}
	stringToSign := symmetricStringToSign(method, path, accessToken, digest, timestamp)
	mac := hmac.New(sha512.New, []byte(clientSecret))
	mac.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil)), nil
}

// equalSignatures compares two base64-encoded signatures for equality in
// constant time (D13). An undecodable signature is never equal to anything.
func equalSignatures(a, b string) bool {
	aBytes, aErr := base64.StdEncoding.DecodeString(a)
	bBytes, bErr := base64.StdEncoding.DecodeString(b)
	if aErr != nil || bErr != nil {
		return false
	}
	return hmac.Equal(aBytes, bBytes)
}
