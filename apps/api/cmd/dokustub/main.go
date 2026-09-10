// Command dokustub is a throwaway stand-in for DOKU's SNAP sandbox, used
// only by apps/order-web-e2e (phase 13 in
// docs/prd-order-checkout-qris-doku.md). It speaks just enough of the
// token/qr-mpm-generate/qr-mpm-query surface (apps/api/data/doku) for a real
// checkout round trip to complete, and exposes one extra, non-DOKU endpoint
// — POST /_stub/pay — that the e2e spec calls to simulate a guest paying:
// it flips the stubbed payment to paid and pushes a correctly signed
// notification to the real API, exactly as DOKU's own webhook would.
//
// Never built into the production binary and never pointed at by anything
// but DOKU_BASE_URL in a test environment.
package main

import (
	"apps/api/utils"
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"
)

const notificationPath = "/payments/doku/notification"

type record struct {
	partnerReferenceNo string
	referenceNo        string
	amountValue        string
	paid               bool
}

type store struct {
	mu      sync.Mutex
	records map[string]*record
}

func newStore() *store {
	return &store{records: map[string]*record{}}
}

func (s *store) put(r *record) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records[r.partnerReferenceNo] = r
}

func (s *store) get(partnerReferenceNo string) (*record, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.records[partnerReferenceNo]
	return r, ok
}

type qrisAmount struct {
	Value    string `json:"value"`
	Currency string `json:"currency"`
}

func main() {
	logger := slog.Default()

	port := os.Getenv("DOKUSTUB_PORT")
	if port == "" {
		port = "8090"
	}
	clientSecret := os.Getenv("DOKUSTUB_CLIENT_SECRET")
	notificationURL := os.Getenv("DOKUSTUB_NOTIFICATION_URL")
	if clientSecret == "" || notificationURL == "" {
		logger.Error("dokustub: DOKUSTUB_CLIENT_SECRET and DOKUSTUB_NOTIFICATION_URL are required")
		os.Exit(1)
	}

	s := newStore()
	httpClient := &http.Client{Timeout: 10 * time.Second}

	mux := http.NewServeMux()

	mux.HandleFunc("POST /authorization/v1/access-token/b2b", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"responseCode":    "2007300",
			"responseMessage": "Successful",
			"accessToken":     "stub-access-token",
			"tokenType":       "Bearer",
			"expiresIn":       900,
		})
	})

	mux.HandleFunc("POST /snap-adapter/b2b/v1.0/qr/qr-mpm-generate", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			PartnerReferenceNo string     `json:"partnerReferenceNo"`
			Amount             qrisAmount `json:"amount"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		rec := &record{
			partnerReferenceNo: body.PartnerReferenceNo,
			referenceNo:        "STUBREF-" + body.PartnerReferenceNo,
			amountValue:        body.Amount.Value,
		}
		s.put(rec)
		logger.Info("dokustub: generated qris", slog.String("partnerReferenceNo", rec.partnerReferenceNo))

		writeJSON(w, http.StatusOK, map[string]any{
			"responseCode":       "2004700",
			"responseMessage":    "Successful",
			"referenceNo":        rec.referenceNo,
			"partnerReferenceNo": rec.partnerReferenceNo,
			"qrContent":          "00020101021226610014ID.CO.DOKU.WWW-STUB-" + rec.partnerReferenceNo,
		})
	})

	mux.HandleFunc("POST /snap-adapter/b2b/v1.0/qr/qr-mpm-query", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			OriginalPartnerReferenceNo string `json:"originalPartnerReferenceNo"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		rec, ok := s.get(body.OriginalPartnerReferenceNo)
		if !ok {
			writeJSON(w, http.StatusOK, map[string]any{
				"responseCode":    "2005501",
				"responseMessage": "Not Found",
			})
			return
		}

		status := "03" // unmapped -> pending (doku.MapTransactionStatus)
		if rec.paid {
			status = "00"
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"responseCode":               "2005500",
			"responseMessage":            "Successful",
			"originalPartnerReferenceNo": rec.partnerReferenceNo,
			"originalReferenceNo":        rec.referenceNo,
			"latestTransactionStatus":    status,
			"transactionStatusDesc":      "stub",
			"amount":                     qrisAmount{Value: rec.amountValue, Currency: "IDR"},
		})
	})

	mux.HandleFunc("POST /_stub/pay", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			PartnerReferenceNo string `json:"partnerReferenceNo"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		rec, ok := s.get(body.PartnerReferenceNo)
		if !ok {
			http.Error(w, "unknown partnerReferenceNo", http.StatusNotFound)
			return
		}
		rec.paid = true

		if err := pushNotification(httpClient, clientSecret, notificationURL, rec); err != nil {
			logger.Error("dokustub: failed to push notification", slog.String("error", err.Error()))
			http.Error(w, "failed to push notification", http.StatusBadGateway)
			return
		}

		logger.Info("dokustub: marked paid and notified", slog.String("partnerReferenceNo", rec.partnerReferenceNo))
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	mux.HandleFunc("GET /_stub/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	logger.Info("dokustub: listening", slog.String("port", port))
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		logger.Error("dokustub: server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

// pushNotification replays exactly the DOKU notification shape and symmetric
// signature scheme apps/api/presentation/restapi/base_middlewares.go
// verifies (D13) — method + path + empty accessToken (notifications arrive
// unauthenticated) + the body's digest + timestamp, HMAC-SHA512 over the
// shared client secret.
func pushNotification(client *http.Client, clientSecret, notificationURL string, rec *record) error {
	body, err := json.Marshal(map[string]any{
		"originalPartnerReferenceNo": rec.partnerReferenceNo,
		"originalReferenceNo":        rec.referenceNo,
		"latestTransactionStatus":    "00",
		"transactionStatusDesc":      "Success",
		"amount":                     qrisAmount{Value: rec.amountValue, Currency: "IDR"},
	})
	if err != nil {
		return err
	}

	timestamp := time.Now().Format(time.RFC3339Nano)
	signature, err := utils.SignDokuSymmetric(clientSecret, http.MethodPost, notificationPath, "", body, timestamp)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, notificationURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return &notificationRejectedError{status: resp.StatusCode, body: string(respBody)}
	}
	return nil
}

type notificationRejectedError struct {
	status int
	body   string
}

func (e *notificationRejectedError) Error() string {
	return "notification rejected: " + http.StatusText(e.status) + ": " + e.body
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}
