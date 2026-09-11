package doku

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func testClient(t *testing.T, baseURL string) *Client {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	return &Client{
		config: Config{
			BaseURL:      baseURL,
			ClientId:     "test-client-id",
			ClientSecret: "test-client-secret",
			PrivateKey:   key,
			MerchantId:   "test-merchant-id",
			ChannelId:    "test-channel-id",
			TerminalId:   "test-terminal-id",
			PostalCode:   "12190",
			FeeType:      "1",
		},
		httpClient: &http.Client{Timeout: requestTimeout},
		token:      &tokenCache{},
		logger:     testLogger(),
	}
}

func TestGetAccessToken_UsesCache(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "server-token", ExpiresIn: 900})
	}))
	defer server.Close()

	client := testClient(t, server.URL)
	client.token.set("cached-token", 900)

	token, err := client.getAccessToken(t.Context())

	require.Nil(t, err)
	assert.Equal(t, "cached-token", token)
	assert.Equal(t, 0, requests, "a fresh cached token must never trigger a request")
}

func TestGetAccessToken_FetchesWhenCacheIsExpired(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "fresh-token", ExpiresIn: 900})
	}))
	defer server.Close()

	client := testClient(t, server.URL)
	client.token.value = "stale-token"
	client.token.expiresAt = time.Now().Add(-time.Second)

	token, err := client.getAccessToken(t.Context())

	require.Nil(t, err)
	assert.Equal(t, "fresh-token", token)
	assert.Equal(t, 1, requests)
}

func TestFetchAccessToken_SignsWithAsymmetricScheme(t *testing.T) {
	var gotClientKey, gotTimestamp, gotSignature, gotBody string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotClientKey = r.Header.Get("X-CLIENT-KEY")
		gotTimestamp = r.Header.Get("X-TIMESTAMP")
		gotSignature = r.Header.Get("X-SIGNATURE")
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	_, err := client.fetchAccessToken(t.Context())

	require.Nil(t, err)
	assert.Equal(t, "test-client-id", gotClientKey)
	assert.NotEmpty(t, gotTimestamp)
	assert.JSONEq(t, `{"grantType":"client_credentials"}`, gotBody)

	expectedSignature, sigErr := signAsymmetric(client.config.PrivateKey, "test-client-id", gotTimestamp)
	require.NoError(t, sigErr)
	assert.Equal(t, expectedSignature, gotSignature)
}

func TestFetchAccessToken_UnknownClientErrorCarriesResponseCode(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		writeJSON(w, tokenResponse{ResponseCode: "4017301", ResponseMessage: "Unauthorized. Unknown Client"})
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	_, err := client.fetchAccessToken(t.Context())

	require.NotNil(t, err)
	assert.Contains(t, err.Message, "Unauthorized. Unknown Client")
	assert.Contains(t, err.Message, "4017301")
}

func TestFetchAccessToken_RejectsNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		writeJSON(w, tokenResponse{ResponseCode: "5007300", ResponseMessage: "General Error"})
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	_, err := client.fetchAccessToken(t.Context())

	require.NotNil(t, err)
}

func TestFetchAccessToken_RejectsMissingAccessToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: ""})
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	_, err := client.fetchAccessToken(t.Context())

	require.NotNil(t, err)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
