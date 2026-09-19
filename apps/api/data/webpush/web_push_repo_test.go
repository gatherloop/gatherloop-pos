package webpush

import (
	"apps/api/domain"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	webpushgo "github.com/SherClockHolmes/webpush-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testClient() *Client {
	privateKey, publicKey, err := webpushgo.GenerateVAPIDKeys()
	if err != nil {
		panic(err)
	}
	return &Client{
		config: Config{PublicKey: publicKey, PrivateKey: privateKey, Subject: "mailto:ops@gatherloop.test"},
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func testMessage(endpoint string) domain.WebPushMessage {
	// A subscription's keys must be valid points/secrets for RFC 8291 encryption to run at all.
	return domain.WebPushMessage{
		Endpoint:  endpoint,
		P256dhKey: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
		AuthKey:   "tBHItJI5svbpez7KI4CCXg",
		Title:     "Pesanan #12 siap diambil!",
		Body:      "Meja 4 · Silakan ambil di counter.",
		Tag:       "order-ORD12345",
		URL:       "/orders/ORD12345",
	}
}

func TestClient_Send_SendsVapidSignedEncryptedRequest(t *testing.T) {
	var gotAuth, gotContentEncoding, gotTTL, gotUrgency string
	var gotBody []byte

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotContentEncoding = r.Header.Get("Content-Encoding")
		gotTTL = r.Header.Get("TTL")
		gotUrgency = r.Header.Get("Urgency")
		gotBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := testClient()

	receipts, err := client.Send(t.Context(), []domain.WebPushMessage{testMessage(server.URL)})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.WebPushReceiptStatusOk, receipts[0].Status)

	assert.Contains(t, gotAuth, "vapid t=")
	assert.Contains(t, gotAuth, "k=")
	assert.Equal(t, "aes128gcm", gotContentEncoding)
	assert.Equal(t, "900", gotTTL)
	assert.Equal(t, "high", gotUrgency)

	assert.NotContains(t, string(gotBody), "Pesanan")
	assert.NotContains(t, string(gotBody), "siap diambil")
}

func TestClient_Send_MapsGoneStatusToWebPushErrorCodeGone(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusGone)
		_, _ = w.Write([]byte("subscription expired"))
	}))
	defer server.Close()

	client := testClient()

	receipts, err := client.Send(t.Context(), []domain.WebPushMessage{testMessage(server.URL)})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.WebPushReceiptStatusError, receipts[0].Status)
	assert.Equal(t, domain.WebPushErrorCodeGone, receipts[0].ErrorCode)
	assert.Contains(t, receipts[0].Message, "subscription expired")
}

func TestClient_Send_MapsNotFoundStatusToWebPushErrorCodeGone(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := testClient()

	receipts, err := client.Send(t.Context(), []domain.WebPushMessage{testMessage(server.URL)})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.WebPushReceiptStatusError, receipts[0].Status)
	assert.Equal(t, domain.WebPushErrorCodeGone, receipts[0].ErrorCode)
}

func TestClient_Send_MapsOtherFailureStatusToTransientError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte("rate limited"))
	}))
	defer server.Close()

	client := testClient()

	receipts, err := client.Send(t.Context(), []domain.WebPushMessage{testMessage(server.URL)})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.WebPushReceiptStatusError, receipts[0].Status)
	assert.Empty(t, receipts[0].ErrorCode)
	assert.Contains(t, receipts[0].Message, "429")
	assert.Contains(t, receipts[0].Message, "rate limited")
}

func TestClient_Send_ParsesMultipleReceiptsInOrder(t *testing.T) {
	okServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))
	defer okServer.Close()

	goneServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusGone)
	}))
	defer goneServer.Close()

	client := testClient()

	receipts, err := client.Send(t.Context(), []domain.WebPushMessage{
		testMessage(okServer.URL),
		testMessage(goneServer.URL),
	})

	require.Nil(t, err)
	require.Len(t, receipts, 2)
	assert.Equal(t, domain.WebPushReceiptStatusOk, receipts[0].Status)
	assert.Equal(t, domain.WebPushReceiptStatusError, receipts[1].Status)
	assert.Equal(t, domain.WebPushErrorCodeGone, receipts[1].ErrorCode)
}

func TestClient_Send_NoMessagesIsNoop(t *testing.T) {
	client := testClient()

	receipts, err := client.Send(t.Context(), nil)

	require.Nil(t, err)
	assert.Nil(t, receipts)
}
