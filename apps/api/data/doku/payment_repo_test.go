package doku

import (
	"apps/api/domain"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestClient(t *testing.T, cancelHandler http.HandlerFunc) (*Client, *httptest.Server) {
	t.Helper()

	privateKey, err := ParsePrivateKeyPEM(testPrivateKeyPEM)
	require.NoError(t, err)

	mux := http.NewServeMux()
	mux.HandleFunc("/authorization/v1/access-token/b2b", func(w http.ResponseWriter, r *http.Request) {
		writeTestJSON(w, http.StatusOK, map[string]any{
			"responseCode":    "2007300",
			"responseMessage": "Successful",
			"accessToken":     "test-access-token",
			"tokenType":       "Bearer",
			"expiresIn":       900,
		})
	})
	mux.HandleFunc(qrCancelPath, cancelHandler)
	server := httptest.NewServer(mux)

	client := NewClient(Config{
		BaseURL:      server.URL,
		ClientId:     "test-client-id",
		ClientSecret: "test-client-secret",
		PrivateKey:   privateKey,
		MerchantId:   "test-merchant",
		ChannelId:    "H2H",
		TerminalId:   "TERM001",
	})

	return client, server
}

func writeTestJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func TestClient_CancelQris_SignsTheRequest(t *testing.T) {
	var gotBody map[string]any
	var gotHeaders http.Header

	client, server := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotHeaders = r.Header.Clone()
		require.NoError(t, json.NewDecoder(r.Body).Decode(&gotBody))
		writeTestJSON(w, http.StatusOK, map[string]any{
			"responseCode":       "2004700",
			"responseMessage":    "Successful",
			"partnerReferenceNo": gotBody["partnerReferenceNo"],
			"referenceNo":        gotBody["referenceNo"],
			"expiredDate":        "2024-01-01T00:00:00+07:00",
		})
	})
	defer server.Close()

	err := client.CancelQris(t.Context(), domain.CancelQrisInput{
		PartnerReferenceNo: "ORD1234567890AB",
		GatewayReferenceNo: "DOKUREF001",
	})

	require.Nil(t, err)
	assert.Equal(t, "test-client-id", gotHeaders.Get("X-PARTNER-ID"))
	assert.Equal(t, "H2H", gotHeaders.Get("CHANNEL-ID"))
	assert.Equal(t, "Bearer test-access-token", gotHeaders.Get("Authorization"))
	assert.NotEmpty(t, gotHeaders.Get("X-EXTERNAL-ID"))
	assert.NotEmpty(t, gotHeaders.Get("X-TIMESTAMP"))
	assert.NotEmpty(t, gotHeaders.Get("X-SIGNATURE"))
	assert.Equal(t, "ORD1234567890AB", gotBody["partnerReferenceNo"])
	assert.Equal(t, "DOKUREF001", gotBody["referenceNo"])
	assert.Equal(t, "test-merchant", gotBody["merchantId"])
}

func TestClient_CancelQris_SuccessResponseCode(t *testing.T) {
	client, server := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeTestJSON(w, http.StatusOK, map[string]any{
			"responseCode":       "2004700",
			"responseMessage":    "Successful",
			"partnerReferenceNo": "ORD1234567890AB",
			"referenceNo":        "DOKUREF001",
			"expiredDate":        "2024-01-01T00:00:00+07:00",
		})
	})
	defer server.Close()

	err := client.CancelQris(t.Context(), domain.CancelQrisInput{PartnerReferenceNo: "ORD1234567890AB", GatewayReferenceNo: "DOKUREF001"})

	assert.Nil(t, err)
}

func TestClient_CancelQris_NonSuccessResponseCodeIsAnError(t *testing.T) {
	client, server := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeTestJSON(w, http.StatusOK, map[string]any{
			"responseCode":    "4045701",
			"responseMessage": "Transaction Not Found",
		})
	})
	defer server.Close()

	err := client.CancelQris(t.Context(), domain.CancelQrisInput{PartnerReferenceNo: "ORDUNKNOWN000", GatewayReferenceNo: "DOKUREF999"})

	require.NotNil(t, err)
	assert.Equal(t, domain.InternalServerError, err.Type)
}

func TestClient_CancelQris_TransportErrorIsAnErrorTheCallerCanIgnore(t *testing.T) {
	client, server := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {})
	// Closing the server before the call reproduces an unreachable DOKU, which CancelPayment
	// (D5) logs and ignores rather than failing the guest's cancel on.
	server.Close()

	err := client.CancelQris(t.Context(), domain.CancelQrisInput{PartnerReferenceNo: "ORD1234567890AB", GatewayReferenceNo: "DOKUREF001"})

	require.NotNil(t, err)
}
