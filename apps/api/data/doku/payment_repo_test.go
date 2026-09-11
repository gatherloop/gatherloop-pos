package doku

import (
	"apps/api/domain"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func TestParsePrivateKeyPEM_PKCS8(t *testing.T) {
	key, err := ParsePrivateKeyPEM(testPrivateKeyPEM)

	require.NoError(t, err)
	assert.NotNil(t, key)
}

func TestParsePrivateKeyPEM_InvalidPEM(t *testing.T) {
	_, err := ParsePrivateKeyPEM("not a pem")
	assert.Error(t, err)
}

func TestParsePrivateKeyPEM_NotAKey(t *testing.T) {
	_, err := ParsePrivateKeyPEM("-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----")
	assert.Error(t, err)
}

func TestFormatTimestamp_MatchesDokuFormat(t *testing.T) {
	now := time.Date(2021, 1, 8, 9, 57, 39, 877000000, time.FixedZone("WIB", 7*60*60))

	formatted := formatTimestamp(now)

	assert.Equal(t, "2021-01-08T09:57:39+07:00", formatted)

	parsed, err := time.Parse(time.RFC3339, formatted)
	require.NoError(t, err)
	assert.True(t, now.Truncate(time.Second).Equal(parsed))
}

func TestFormatAmount(t *testing.T) {
	assert.Equal(t, "10000.00", formatAmount(10000))
	assert.Equal(t, "1500.50", formatAmount(1500.5))
}

func TestIsSuccessResponseCode(t *testing.T) {
	assert.True(t, isSuccessResponseCode("2004700"))
	assert.True(t, isSuccessResponseCode("2005500"))
	assert.False(t, isSuccessResponseCode("4004701"))
	assert.False(t, isSuccessResponseCode("5004701"))
	assert.False(t, isSuccessResponseCode(""))
}

func TestMapTransactionStatus(t *testing.T) {
	tests := []struct {
		code     string
		expected domain.PaymentGatewayStatus
	}{
		{"00", domain.PaymentGatewayStatusPaid},
		{"05", domain.PaymentGatewayStatusExpired},
		{"06", domain.PaymentGatewayStatusFailed},
		{"07", domain.PaymentGatewayStatusFailed},
		{"01", domain.PaymentGatewayStatusPending},
		{"unknown-code", domain.PaymentGatewayStatusPending},
		{"", domain.PaymentGatewayStatusPending},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			assert.Equal(t, tt.expected, MapTransactionStatus(tt.code))
		})
	}
}

func TestGenerateExternalId_UniqueAndNumeric(t *testing.T) {
	a := generateExternalId()
	b := generateExternalId()

	assert.NotEqual(t, a, b)
	for _, r := range a {
		assert.True(t, r >= '0' && r <= '9', "external id must be numeric")
	}
}

func TestDoSignedRequest_RetriesOnceOn401(t *testing.T) {
	tokenRequests := 0
	callRequests := 0
	sawUnauthorizedOnce := false

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case tokenPath:
			tokenRequests++
			writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
		case qrGeneratePath:
			callRequests++
			if !sawUnauthorizedOnce {
				sawUnauthorizedOnce = true
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			writeJSON(w, generateQrisResponse{ResponseCode: "2004700", ReferenceNo: "REF1", PartnerReferenceNo: "ORD1", QrContent: "qr-content"})
		}
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	payment, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.Nil(t, err)
	assert.Equal(t, "qr-content", payment.QrContent)
	assert.Equal(t, 2, callRequests, "the generate call must be retried exactly once after a 401")
	assert.Equal(t, 2, tokenRequests, "a 401 must invalidate the cached token and force a re-fetch")
}

func TestDoSignedRequest_NonRetryableFailureIsNotRetried(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case tokenPath:
			writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
		case qrGeneratePath:
			requests++
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	client := testClient(t, server.URL)

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.NotNil(t, err)
	assert.Equal(t, 1, requests)
}

func stubTokenAndPath(t *testing.T, path string, handler http.HandlerFunc) *Client {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == tokenPath {
			writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
			return
		}
		if r.URL.Path == path {
			handler(w, r)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	t.Cleanup(server.Close)
	return testClient(t, server.URL)
}

func TestGenerateQris_Success(t *testing.T) {
	expiredAt := time.Now().Add(5 * time.Minute)
	client := stubTokenAndPath(t, qrGeneratePath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, generateQrisResponse{
			ResponseCode:       "2004700",
			ReferenceNo:        "REF-1",
			PartnerReferenceNo: "ORD1",
			QrContent:          "00020101021226...",
		})
	})

	payment, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{
		PartnerReferenceNo: "ORD1",
		Amount:             10000,
		ExpiredAt:          expiredAt,
	})

	require.Nil(t, err)
	assert.Equal(t, "ORD1", payment.PartnerReferenceNo)
	assert.Equal(t, "REF-1", payment.GatewayReferenceNo)
	assert.Equal(t, "00020101021226...", payment.QrContent)
	assert.True(t, expiredAt.Equal(payment.ExpiredAt))
}

func TestGenerateQris_SendsAmountAsTwoDecimalString(t *testing.T) {
	var gotBody generateQrisRequest
	client := stubTokenAndPath(t, qrGeneratePath, func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, decodeJSON(r, &gotBody))
		writeJSON(w, generateQrisResponse{ResponseCode: "2004700", PartnerReferenceNo: "ORD1", ReferenceNo: "REF1"})
	})

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 12345})

	require.Nil(t, err)
	assert.Equal(t, "12345.00", gotBody.Amount.Value)
	assert.Equal(t, "IDR", gotBody.Amount.Currency)
	assert.Equal(t, "ORD1", gotBody.PartnerReferenceNo)
}

func TestGenerateQris_RejectedResponseCode(t *testing.T) {
	client := stubTokenAndPath(t, qrGeneratePath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, generateQrisResponse{ResponseCode: "4004701", ResponseMessage: "Invalid Field Format"})
	})

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 1000})

	require.NotNil(t, err)
	assert.Equal(t, domain.InternalServerError, err.Type)
}

func TestQueryQris_MapsPaidStatus(t *testing.T) {
	client := stubTokenAndPath(t, qrQueryPath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, queryQrisResponse{
			ResponseCode:               "2005500",
			OriginalPartnerReferenceNo: "ORD1",
			OriginalReferenceNo:        "REF1",
			LatestTransactionStatus:    "00",
			Amount:                     qrisAmount{Value: "10000.00", Currency: "IDR"},
		})
	})

	status, err := client.QueryQris(t.Context(), domain.QueryQrisInput{PartnerReferenceNo: "ORD1", GatewayReferenceNo: "REF1"})

	require.Nil(t, err)
	assert.Equal(t, domain.PaymentGatewayStatusPaid, status.Status)
	assert.Equal(t, float32(10000), status.PaidAmount)
	assert.Equal(t, "00", status.RawStatusCode)
}

func TestQueryQris_MapsExpiredAndFailedStatuses(t *testing.T) {
	tests := []struct {
		code     string
		expected domain.PaymentGatewayStatus
	}{
		{"05", domain.PaymentGatewayStatusExpired},
		{"06", domain.PaymentGatewayStatusFailed},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			client := stubTokenAndPath(t, qrQueryPath, func(w http.ResponseWriter, r *http.Request) {
				writeJSON(w, queryQrisResponse{ResponseCode: "2005500", LatestTransactionStatus: tt.code})
			})

			status, err := client.QueryQris(t.Context(), domain.QueryQrisInput{PartnerReferenceNo: "ORD1"})

			require.Nil(t, err)
			assert.Equal(t, tt.expected, status.Status)
		})
	}
}

func TestQueryQris_UnknownStatusCodeIsPendingNeverPaid(t *testing.T) {
	client := stubTokenAndPath(t, qrQueryPath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, queryQrisResponse{ResponseCode: "2005500", LatestTransactionStatus: "99"})
	})

	status, err := client.QueryQris(t.Context(), domain.QueryQrisInput{PartnerReferenceNo: "ORD1"})

	require.Nil(t, err)
	assert.Equal(t, domain.PaymentGatewayStatusPending, status.Status)
}

func TestQueryQris_NonSuccessResponseCodeIsPendingNeverPaid(t *testing.T) {
	client := stubTokenAndPath(t, qrQueryPath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, queryQrisResponse{ResponseCode: "4045500", ResponseMessage: "Not Found"})
	})

	status, err := client.QueryQris(t.Context(), domain.QueryQrisInput{PartnerReferenceNo: "ORD1"})

	require.Nil(t, err)
	assert.Equal(t, domain.PaymentGatewayStatusPending, status.Status)
}
