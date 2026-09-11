package doku

import (
	"apps/api/domain"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestParsePrivateKeyPEM_EscapedNewlines(t *testing.T) {
	escaped := strings.ReplaceAll(testPrivateKeyPEM, "\n", `\n`)

	key, err := ParsePrivateKeyPEM(escaped)

	require.NoError(t, err)
	assert.NotNil(t, key)
}

func TestParsePrivateKeyPEM_SurroundingQuotesAndWhitespace(t *testing.T) {
	quoted := "  \"" + strings.ReplaceAll(testPrivateKeyPEM, "\n", `\n`) + "\"\n"

	key, err := ParsePrivateKeyPEM(quoted)

	require.NoError(t, err)
	assert.NotNil(t, key)
}

func TestConfigValidate(t *testing.T) {
	key, keyErr := ParsePrivateKeyPEM(testPrivateKeyPEM)
	require.NoError(t, keyErr)

	complete := Config{
		BaseURL:      "https://api-sandbox.doku.com",
		ClientId:     "client-id",
		ClientSecret: "client-secret",
		PrivateKey:   key,
		MerchantId:   "merchant-id",
		ChannelId:    "channel-id",
		TerminalId:   "terminal-id",
	}

	require.NoError(t, complete.Validate())

	tests := []struct {
		name    string
		mutate  func(*Config)
		missing string
	}{
		{"base url", func(c *Config) { c.BaseURL = "" }, "DOKU_BASE_URL"},
		{"client id", func(c *Config) { c.ClientId = "" }, "DOKU_CLIENT_ID"},
		{"client secret", func(c *Config) { c.ClientSecret = "" }, "DOKU_CLIENT_SECRET"},
		{"merchant id", func(c *Config) { c.MerchantId = "" }, "DOKU_MERCHANT_ID"},
		{"channel id", func(c *Config) { c.ChannelId = "" }, "DOKU_CHANNEL_ID"},
		{"terminal id", func(c *Config) { c.TerminalId = "" }, "DOKU_TERMINAL_ID"},
		{"private key", func(c *Config) { c.PrivateKey = nil }, "DOKU_PRIVATE_KEY"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := complete
			tt.mutate(&config)

			err := config.Validate()

			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.missing)
		})
	}
}

func TestMaskCredential(t *testing.T) {
	assert.Equal(t, "<empty>", maskCredential(""))
	assert.Equal(t, "****", maskCredential("abcd"))
	assert.Equal(t, "****6789", maskCredential("BRN-0221-123456789"))
}

func TestFormatTimestamp_MatchesDokuFormat(t *testing.T) {
	now := time.Date(2020, 12, 21, 14, 56, 11, 877000000, time.FixedZone("WIB", 7*60*60))

	formatted := formatTimestamp(now)

	assert.Equal(t, "2020-12-21T14:56:11+07:00", formatted)

	parsed, err := time.Parse(time.RFC3339, formatted)
	require.NoError(t, err)
	assert.True(t, now.Truncate(time.Second).Equal(parsed))
}

func TestFormatTimestamp_RendersNumericOffsetForAnyHostClock(t *testing.T) {
	instant := time.Date(2022, 10, 7, 7, 26, 50, 0, time.UTC)

	hosts := map[string]*time.Location{
		"utc host":     time.UTC,
		"jakarta host": time.FixedZone("WIB", 7*60*60),
		"tokyo host":   time.FixedZone("JST", 9*60*60),
	}

	for name, host := range hosts {
		t.Run(name, func(t *testing.T) {
			formatted := formatTimestamp(instant.In(host))

			assert.Equal(t, "2022-10-07T14:26:50+07:00", formatted)
			assert.NotContains(t, formatted, "Z")
		})
	}
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

func TestDoSignedRequest_ReportsWhyDokuRejectedTheCall(t *testing.T) {
	client := stubTokenAndPath(t, qrGeneratePath, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		writeJSON(w, failureResponse{ResponseCode: "5004700", ResponseMessage: "Internal Server Error"})
	})

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.NotNil(t, err)
	assert.Contains(t, err.Message, "5004700")
	assert.Contains(t, err.Message, "Internal Server Error")
}

func TestDescribeFailure(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		expected string
	}{
		{"doku error", `{"responseCode":"4004701","responseMessage":"Invalid Field Format terminalId"}`, "4004701 Invalid Field Format terminalId"},
		{"message only", `{"responseMessage":"Internal Server Error"}`, "Internal Server Error"},
		{"non json", "<html>502 Bad Gateway</html>", "<html>502 Bad Gateway</html>"},
		{"empty", "  ", "<empty response body>"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, describeFailure([]byte(tt.body)))
		})
	}
}

func TestDescribeFailure_TruncatesLongBody(t *testing.T) {
	detail := describeFailure([]byte(strings.Repeat("x", maxFailureDetailLength+100)))

	assert.Equal(t, strings.Repeat("x", maxFailureDetailLength)+"...", detail)
}

func TestNewClient_TrimsTrailingSlashFromBaseURL(t *testing.T) {
	requestedPaths := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPaths = append(requestedPaths, r.URL.Path)
		switch r.URL.Path {
		case tokenPath:
			writeJSON(w, tokenResponse{ResponseCode: "2007300", AccessToken: "token", ExpiresIn: 900})
		case qrGeneratePath:
			writeJSON(w, generateQrisResponse{ResponseCode: "2004700", PartnerReferenceNo: "ORD1", ReferenceNo: "REF1"})
		}
	}))
	defer server.Close()

	client := NewClient(testClient(t, server.URL+"/").config)
	client.logger = testLogger()

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.Nil(t, err)
	assert.Equal(t, []string{tokenPath, qrGeneratePath}, requestedPaths, "a trailing slash must not double the slash the signature was computed over")
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

func TestGenerateQris_SendsTerminalIdValidityPeriodAndAdditionalInfo(t *testing.T) {
	var gotBody generateQrisRequest
	client := stubTokenAndPath(t, qrGeneratePath, func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, decodeJSON(r, &gotBody))
		writeJSON(w, generateQrisResponse{ResponseCode: "2004700", PartnerReferenceNo: "ORD1", ReferenceNo: "REF1"})
	})

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{
		PartnerReferenceNo: "ORD1",
		Amount:             10000,
		ExpiredAt:          time.Date(2025, 11, 30, 19, 27, 15, 0, dokuTimeZone),
	})

	require.Nil(t, err)
	assert.Equal(t, "test-terminal-id", gotBody.TerminalId)
	assert.Equal(t, "2025-11-30T19:27:15+07:00", gotBody.ValidityPeriod)
	assert.Equal(t, "12190", gotBody.AdditionalInfo.PostalCode)
	assert.Equal(t, "1", gotBody.AdditionalInfo.FeeType)
}

func TestGenerateQris_AlwaysSendsAdditionalInfoObject(t *testing.T) {
	var gotBody map[string]any
	client := stubTokenAndPath(t, qrGeneratePath, func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, decodeJSON(r, &gotBody))
		writeJSON(w, generateQrisResponse{ResponseCode: "2004700", PartnerReferenceNo: "ORD1", ReferenceNo: "REF1"})
	})
	client.config.PostalCode = ""
	client.config.FeeType = ""

	_, err := client.GenerateQris(t.Context(), domain.GenerateQrisInput{PartnerReferenceNo: "ORD1", Amount: 10000})

	require.Nil(t, err)
	assert.Equal(t, map[string]any{}, gotBody["additionalInfo"])
	assert.NotContains(t, gotBody, "validityPeriod")
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
