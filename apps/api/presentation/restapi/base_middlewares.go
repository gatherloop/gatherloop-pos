package restapi

import (
	"apps/api/utils"
	"apps/api/utils/logger"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	apiContract "libs/api-contract"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// sessionIdPattern matches a UUIDv4, the shape BrowserSessionRepository mints
// client-side (D3). An anonymous guest has no credential to check — the
// session ID itself is the capability that owns a cart (D8), so this is the
// closest anonymous equivalent to CheckAuth.
var sessionIdPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func EnableCORS(next http.Handler) http.Handler {
	allowedOrigins := utils.GetEnv().CorsAllowedOrigins

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		w.Header().Add("Vary", "Origin")

		if isOriginAllowed(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With, X-Session-Id")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		} else {
			next.ServeHTTP(w, r)
		}
	})
}

// isOriginAllowed reports whether origin is present in allowedOrigins. An
// empty origin (same-origin or non-browser requests never send the header)
// is never treated as allowed.
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	if origin == "" {
		return false
	}

	for _, allowed := range allowedOrigins {
		if allowed == origin {
			return true
		}
	}

	return false
}

func CheckAuth(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorizationToken := ""

		cookie, err := r.Cookie("Authorization")
		if err != nil {
			authorizationToken = r.Header.Get("Authorization")
		} else {
			authorizationToken = cookie.Value
		}

		tokenSplit := strings.Split(authorizationToken, " ")

		tokenString := ""
		if len(tokenSplit) > 1 {
			tokenString = tokenSplit[1]
		}

		_, err = jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(utils.GetEnv().JwtSecret), nil
		})

		if err != nil {
			log := logger.FromCtx(r.Context(), slog.Default())
			log.WarnContext(r.Context(), "authentication failed",
				slog.String("error", err.Error()),
			)
			WriteError(r.Context(), w, apiContract.Error{Code: apiContract.UNAUTHORIZED, Message: "Credential Error"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireSessionId guards the cart routes (FR-3). Missing or malformed
// X-Session-Id is a 400, not a 401/404 — there is no credential to be
// unauthorized about, just a header the client is expected to always send.
func RequireSessionId(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionId := r.Header.Get("X-Session-Id")
		if !sessionIdPattern.MatchString(sessionId) {
			WriteError(r.Context(), w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: "X-Session-Id header must be a valid UUIDv4"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// dokuNotificationTimestampSkew is D13's window: "a skewed or missing
// X-TIMESTAMP (> 5 min) is rejected".
const dokuNotificationTimestampSkew = 5 * time.Minute

func VerifyDokuSignature(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, readErr := io.ReadAll(r.Body)
		if readErr != nil {
			WriteError(r.Context(), w, apiContract.Error{Code: apiContract.UNAUTHORIZED, Message: "failed to read request body"})
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))

		if err := verifyDokuNotificationSignature(r.Method, r.URL.Path, r.Header.Get("X-TIMESTAMP"), r.Header.Get("X-SIGNATURE"), body); err != nil {
			var reference struct {
				OriginalPartnerReferenceNo string `json:"originalPartnerReferenceNo"`
			}
			json.Unmarshal(body, &reference)

			log := logger.FromCtx(r.Context(), slog.Default())
			log.ErrorContext(r.Context(), "doku notification signature verification failed",
				slog.String("partnerReferenceNo", reference.OriginalPartnerReferenceNo),
				slog.String("error", err.Error()),
			)
			WriteError(r.Context(), w, apiContract.Error{Code: apiContract.UNAUTHORIZED, Message: "invalid notification signature"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// verifyDokuNotificationSignature checks a DOKU notification's symmetric
// signature and timestamp freshness (D13), using the client secret from
// env directly — like CheckAuth reads JWT_SECRET — so this middleware
// depends on nothing but utils.
func verifyDokuNotificationSignature(method, path, timestamp, signature string, body []byte) error {
	if timestamp == "" {
		return fmt.Errorf("missing X-TIMESTAMP")
	}

	parsedTimestamp, parseErr := time.Parse(time.RFC3339Nano, timestamp)
	if parseErr != nil {
		return fmt.Errorf("invalid X-TIMESTAMP")
	}

	if skew := time.Since(parsedTimestamp); skew > dokuNotificationTimestampSkew || skew < -dokuNotificationTimestampSkew {
		return fmt.Errorf("X-TIMESTAMP is outside the allowed window")
	}

	if signature == "" {
		return fmt.Errorf("missing X-SIGNATURE")
	}

	// The notification arrives unauthenticated (no bearer token), so its
	// signature is computed with an empty accessToken segment (D13).
	expected, sigErr := utils.SignDokuSymmetric(utils.GetEnv().DokuClientSecret, method, path, "", body, timestamp)
	if sigErr != nil {
		return fmt.Errorf("failed to verify DOKU notification signature: %w", sigErr)
	}

	if !utils.EqualDokuSignatures(expected, signature) {
		return fmt.Errorf("invalid notification signature")
	}

	return nil
}
