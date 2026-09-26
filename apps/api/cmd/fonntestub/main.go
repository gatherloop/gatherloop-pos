package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
)

// A number ending in these digits is the only one the stub reports as having no WhatsApp
// account, so a spec can pick "registered" vs "not_registered" just by choosing its test number
// (docs/prd-order-whatsapp-number-validation.md phase 8).
const notRegisteredSuffix = "0000"

type callCounter struct {
	mu     sync.Mutex
	counts map[string]int
}

func newCallCounter() *callCounter {
	return &callCounter{counts: map[string]int{}}
}

func (c *callCounter) increment(target string) int {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.counts[target]++
	return c.counts[target]
}

func (c *callCounter) get(target string) int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.counts[target]
}

func main() {
	logger := slog.Default()

	port := os.Getenv("FONNTESTUB_PORT")
	if port == "" {
		port = "8091"
	}

	validateCalls := newCallCounter()

	mux := http.NewServeMux()

	mux.HandleFunc("POST /validate", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		target := r.FormValue("target")
		if target == "" {
			http.Error(w, "missing target", http.StatusBadRequest)
			return
		}

		calls := validateCalls.increment(target)

		if strings.HasSuffix(target, notRegisteredSuffix) {
			logger.Info("fonntestub: validated", slog.String("target", target), slog.String("result", "not_registered"), slog.Int("calls", calls))
			writeJSON(w, http.StatusOK, map[string]any{
				"status":         true,
				"registered":     []string{},
				"not_registered": []string{target},
			})
			return
		}

		logger.Info("fonntestub: validated", slog.String("target", target), slog.String("result", "registered"), slog.Int("calls", calls))
		writeJSON(w, http.StatusOK, map[string]any{
			"status":         true,
			"registered":     []string{target},
			"not_registered": []string{},
		})
	})

	mux.HandleFunc("POST /send", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		target := r.FormValue("target")
		if target == "" {
			http.Error(w, "missing target", http.StatusBadRequest)
			return
		}

		logger.Info("fonntestub: sent", slog.String("target", target))
		writeJSON(w, http.StatusOK, map[string]any{
			"status": true,
			"id":     []string{"stub-message-" + target},
		})
	})

	mux.HandleFunc("GET /_stub/calls/{target}", func(w http.ResponseWriter, r *http.Request) {
		target := r.PathValue("target")
		writeJSON(w, http.StatusOK, map[string]any{"calls": validateCalls.get(target)})
	})

	mux.HandleFunc("GET /_stub/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	logger.Info("fonntestub: listening", slog.String("port", port))
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		logger.Error("fonntestub: server stopped", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}
