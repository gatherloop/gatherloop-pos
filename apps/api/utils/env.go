package utils

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

func LoadEnv() error {
	return godotenv.Load()
}

type Env struct {
	DbUsername         string
	DbPassword         string
	DbName             string
	DbHost             string
	DbPort             string
	Port               string
	JwtSecret          string
	LogLevel           string
	AppEnv             string
	ServiceName        string
	CorsAllowedOrigins []string

	// DOKU (FR-3, D21): sandbox vs production is selected entirely by
	// these values, never by a build flag. Read once at boot; wired into
	// nothing until phase 6.
	DokuBaseURL           string
	DokuClientId          string
	DokuClientSecret      string
	DokuPrivateKey        string
	DokuMerchantId        string
	DokuChannelId         string
	DokuQrisExpirySeconds int
	OrderPaymentWalletId  string
}

func GetEnv() Env {
	serviceName := os.Getenv("SERVICE_NAME")
	if serviceName == "" {
		serviceName = "gatherloop-pos-api"
	}

	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	return Env{
		DbUsername:         os.Getenv("DB_USERNAME"),
		DbPassword:         os.Getenv("DB_PASSWORD"),
		DbName:             os.Getenv("DB_NAME"),
		DbHost:             os.Getenv("DB_HOST"),
		DbPort:             os.Getenv("DB_PORT"),
		Port:               os.Getenv("PORT"),
		JwtSecret:          os.Getenv("JWT_SECRET"),
		LogLevel:           logLevel,
		AppEnv:             appEnv,
		ServiceName:        serviceName,
		CorsAllowedOrigins: parseCorsAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS")),

		DokuBaseURL:           os.Getenv("DOKU_BASE_URL"),
		DokuClientId:          os.Getenv("DOKU_CLIENT_ID"),
		DokuClientSecret:      os.Getenv("DOKU_CLIENT_SECRET"),
		DokuPrivateKey:        os.Getenv("DOKU_PRIVATE_KEY"),
		DokuMerchantId:        os.Getenv("DOKU_MERCHANT_ID"),
		DokuChannelId:         os.Getenv("DOKU_CHANNEL_ID"),
		DokuQrisExpirySeconds: parseIntWithDefault(os.Getenv("DOKU_QRIS_EXPIRY_SECONDS"), 300),
		OrderPaymentWalletId:  os.Getenv("ORDER_PAYMENT_WALLET_ID"),
	}
}

// parseIntWithDefault parses raw as an integer, falling back to def when raw
// is empty or not a valid integer (DOKU_QRIS_EXPIRY_SECONDS defaults to 300
// per D-resolved-question-2).
func parseIntWithDefault(raw string, def int) int {
	if raw == "" {
		return def
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return def
	}
	return value
}

// parseCorsAllowedOrigins splits a comma-separated list of origins (e.g.
// "https://gatherloop.github.io,http://localhost:3000") into a trimmed,
// non-empty slice.
func parseCorsAllowedOrigins(raw string) []string {
	if raw == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}

	return origins
}
