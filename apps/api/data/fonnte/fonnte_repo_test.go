package fonnte

import (
	"apps/api/domain"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testClient(baseURL string, timeout time.Duration) *Client {
	return &Client{
		config:     Config{Token: "test-token", BaseURL: baseURL},
		httpClient: &http.Client{Timeout: timeout},
		logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func testMessage() domain.WhatsAppMessage {
	return domain.WhatsAppMessage{To: "6281234567890", Body: "Pesanan #12 sudah siap diambil!"}
}

func TestClient_Send_SendsAuthorizationHeaderAndFormFields(t *testing.T) {
	var gotAuth string
	var gotTarget, gotMessage, gotCountryCode string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")

		_, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		require.NoError(t, err)
		require.NoError(t, r.ParseMultipartForm(0))
		_ = params

		gotTarget = r.FormValue("target")
		gotMessage = r.FormValue("message")
		gotCountryCode = r.FormValue("countryCode")

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":true,"id":["abc123"]}`))
	}))
	defer server.Close()

	client := testClient(server.URL, requestTimeout)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeAccepted, result.Outcome)
	assert.Equal(t, "abc123", result.ProviderMessageId)

	assert.Equal(t, "test-token", gotAuth)
	assert.Equal(t, "6281234567890", gotTarget)
	assert.Equal(t, "Pesanan #12 sudah siap diambil!", gotMessage)
	assert.Equal(t, "0", gotCountryCode)
}

func TestClient_Send_Http2xxStatusFalse_IsRejected(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":false,"reason":"device not connected"}`))
	}))
	defer server.Close()

	client := testClient(server.URL, requestTimeout)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeRejected, result.Outcome)
	assert.Equal(t, "device not connected", result.Detail)
}

func TestClient_Send_Http4xxWithBody_IsRejected(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"status":false,"reason":"invalid token"}`))
	}))
	defer server.Close()

	client := testClient(server.URL, requestTimeout)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeRejected, result.Outcome)
	assert.Contains(t, result.Detail, "invalid token")
}

func TestClient_Send_Http5xxWithBody_IsRejected(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("internal error"))
	}))
	defer server.Close()

	client := testClient(server.URL, requestTimeout)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeRejected, result.Outcome)
	assert.Contains(t, result.Detail, "internal error")
}

func TestClient_Send_DialErrorBeforeAnyByteWritten_IsRejected(t *testing.T) {
	// A closed listener refuses the connection before anything is written to the wire.
	listener := newClosedListener(t)

	client := testClient("http://"+listener, requestTimeout)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeRejected, result.Outcome)
}

func TestClient_Send_TimeoutPastDeadline_IsUnknown(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":true,"id":["abc123"]}`))
	}))
	defer server.Close()

	client := testClient(server.URL, 10*time.Millisecond)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeUnknown, result.Outcome)
}

func TestClient_Send_UnparseableBody_IsUnknown(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("not json"))
	}))
	defer server.Close()

	client := testClient(server.URL, requestTimeout)

	result, err := client.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeUnknown, result.Outcome)
}

func TestDisabledClient_Send_IsRejectedWithSentinelDetail(t *testing.T) {
	gateway := NewDisabledWhatsAppGateway()

	result, err := gateway.Send(t.Context(), testMessage())

	require.Nil(t, err)
	assert.Equal(t, domain.WhatsAppSendOutcomeRejected, result.Outcome)
	assert.Equal(t, disabledGatewayDetail, result.Detail)
}

// newClosedListener opens then immediately closes a TCP listener, handing back an address that
// nothing is listening on, so a dial against it fails with "connection refused".
func newClosedListener(t *testing.T) string {
	t.Helper()
	listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp", "127.0.0.1:0")
	require.NoError(t, err)
	addr := listener.Addr().String()
	require.NoError(t, listener.Close())
	return addr
}
