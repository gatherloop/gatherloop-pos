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

		DokuBaseURL:           getCredential("DOKU_BASE_URL"),
		DokuClientId:          getCredential("DOKU_CLIENT_ID"),
		DokuClientSecret:      getCredential("DOKU_CLIENT_SECRET"),
		DokuPrivateKey:        os.Getenv("DOKU_PRIVATE_KEY"),
		DokuMerchantId:        getCredential("DOKU_MERCHANT_ID"),
		DokuChannelId:         getCredential("DOKU_CHANNEL_ID"),
		DokuQrisExpirySeconds: parseIntWithDefault(os.Getenv("DOKU_QRIS_EXPIRY_SECONDS"), 300),
		OrderPaymentWalletId:  os.Getenv("ORDER_PAYMENT_WALLET_ID"),
	}
}

// A CI-written .env can leave a credential quoted or newline-terminated, which DOKU rejects as an unknown client.
func getCredential(name string) string {
	return strings.Trim(strings.TrimSpace(os.Getenv(name)), `"'`)
}

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
