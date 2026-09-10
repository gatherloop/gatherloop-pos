package doku

import (
	"apps/api/domain"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
