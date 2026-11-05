package expopush

import (
	"apps/api/domain"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testClient(baseURL string) *Client {
	return &Client{
		config:     Config{BaseURL: baseURL, AccessToken: "test-access-token"},
		httpClient: &http.Client{Timeout: requestTimeout},
		logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func TestClient_Send_SendsRequestBodyAndHeaders(t *testing.T) {
	var gotAuth, gotContentType, gotBody string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotContentType = r.Header.Get("Content-Type")
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(sendResponse{Data: []pushReceiptResponse{{Status: "ok", Id: "receipt-1"}}})
	}))
	defer server.Close()

	client := testClient(server.URL)

	receipts, err := client.Send(t.Context(), []domain.KdsPushMessage{
		{To: "ExponentPushToken[abc]", Title: "New order #12", Body: "BAR: 2x Kopi Susu", Sound: "default", ChannelId: "orders-v1", Priority: domain.KdsPushPriorityHigh, Data: map[string]any{"transactionId": float64(12)}},
	})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.KdsPushReceiptStatusOk, receipts[0].Status)

	assert.Equal(t, "Bearer test-access-token", gotAuth)
	assert.Equal(t, "application/json", gotContentType)
	assert.JSONEq(t, `[{"to":"ExponentPushToken[abc]","title":"New order #12","body":"BAR: 2x Kopi Susu","sound":"default","channelId":"orders-v1","priority":"high","data":{"transactionId":12}}]`, gotBody)
}

func TestClient_Send_SendsPriorityHighSoADozingPhoneIsWoken(t *testing.T) {
	var gotBody string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		writeJSON(w, sendResponse{Data: []pushReceiptResponse{{Status: "ok"}}})
	}))
	defer server.Close()

	client := testClient(server.URL)

	_, err := client.Send(t.Context(), []domain.KdsPushMessage{
		{To: "ExponentPushToken[abc]", Priority: domain.KdsPushPriorityHigh},
	})

	require.Nil(t, err)

	var payload []map[string]any
	require.NoError(t, json.Unmarshal([]byte(gotBody), &payload))
	require.Len(t, payload, 1)
	assert.Equal(t, "high", payload[0]["priority"])
}

func TestClient_Send_ParsesOkReceipt(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, sendResponse{Data: []pushReceiptResponse{{Status: "ok", Id: "receipt-1"}}})
	}))
	defer server.Close()

	client := testClient(server.URL)

	receipts, err := client.Send(t.Context(), []domain.KdsPushMessage{{To: "ExponentPushToken[abc]"}})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.KdsPushReceiptStatusOk, receipts[0].Status)
	assert.Empty(t, receipts[0].ErrorCode)
}

func TestClient_Send_ParsesDeviceNotRegisteredReceipt(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, sendResponse{Data: []pushReceiptResponse{
			{Status: "error", Message: "\"ExponentPushToken[dead]\" is not a registered push notification recipient", Details: pushReceiptDetails{Error: domain.KdsPushErrorCodeDeviceNotRegistered}},
		}})
	}))
	defer server.Close()

	client := testClient(server.URL)

	receipts, err := client.Send(t.Context(), []domain.KdsPushMessage{{To: "ExponentPushToken[dead]"}})

	require.Nil(t, err)
	require.Len(t, receipts, 1)
	assert.Equal(t, domain.KdsPushReceiptStatusError, receipts[0].Status)
	assert.Equal(t, domain.KdsPushErrorCodeDeviceNotRegistered, receipts[0].ErrorCode)
	assert.NotEmpty(t, receipts[0].Message)
}

func TestClient_Send_ParsesMultipleReceiptsInOrder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, sendResponse{Data: []pushReceiptResponse{
			{Status: "ok"},
			{Status: "error", Details: pushReceiptDetails{Error: domain.KdsPushErrorCodeDeviceNotRegistered}},
		}})
	}))
	defer server.Close()

	client := testClient(server.URL)

	receipts, err := client.Send(t.Context(), []domain.KdsPushMessage{
		{To: "ExponentPushToken[abc]"},
		{To: "ExponentPushToken[dead]"},
	})

	require.Nil(t, err)
	require.Len(t, receipts, 2)
	assert.Equal(t, domain.KdsPushReceiptStatusOk, receipts[0].Status)
	assert.Equal(t, domain.KdsPushReceiptStatusError, receipts[1].Status)
}

func TestClient_Send_RejectsNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"errors":[{"code":"UNAUTHORIZED","message":"Invalid access token"}]}`))
	}))
	defer server.Close()

	client := testClient(server.URL)

	receipts, err := client.Send(t.Context(), []domain.KdsPushMessage{{To: "ExponentPushToken[abc]"}})

	require.NotNil(t, err)
	assert.Equal(t, domain.BadGateway, err.Type)
	assert.Contains(t, err.Message, "Invalid access token")
	assert.Nil(t, receipts)
}

func TestClient_Send_RejectsMalformedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`not json`))
	}))
	defer server.Close()

	client := testClient(server.URL)

	_, err := client.Send(t.Context(), []domain.KdsPushMessage{{To: "ExponentPushToken[abc]"}})

	require.NotNil(t, err)
	assert.Equal(t, domain.BadGateway, err.Type)
}

func TestClient_Send_NoMessagesIsNoop(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
	}))
	defer server.Close()

	client := testClient(server.URL)

	receipts, err := client.Send(t.Context(), nil)

	require.Nil(t, err)
	assert.Nil(t, receipts)
	assert.Equal(t, 0, requests)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
