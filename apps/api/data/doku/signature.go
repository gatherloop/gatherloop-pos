package doku

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
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
