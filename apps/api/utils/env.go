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

	DokuBaseURL               string
	DokuClientId              string
	DokuClientSecret          string
	DokuPrivateKey            string
	DokuMerchantId            string
	DokuChannelId             string
	DokuTerminalId            string
	DokuPostalCode            string
	DokuFeeType               string
	DokuQrisExpirySeconds     int
	CashPaymentExpirySeconds  int
	OrderPaymentWalletId      string
	OrderWebBaseURL           string
	OrderPaymentCancelEnabled bool

	ExpoPushAccessToken        string
	KdsPushSound               string
	KdsDispatchIntervalSeconds int

	FonnteToken   string
	FonnteBaseURL string

	WhatsappNumberValidationEnabled bool
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

		DokuBaseURL:               getCredential("DOKU_BASE_URL"),
		DokuClientId:              getCredential("DOKU_CLIENT_ID"),
		DokuClientSecret:          getCredential("DOKU_CLIENT_SECRET"),
		DokuPrivateKey:            os.Getenv("DOKU_PRIVATE_KEY"),
		DokuMerchantId:            getCredential("DOKU_MERCHANT_ID"),
		DokuChannelId:             getCredential("DOKU_CHANNEL_ID"),
		DokuTerminalId:            getCredential("DOKU_TERMINAL_ID"),
		DokuPostalCode:            getCredential("DOKU_MERCHANT_POSTAL_CODE"),
		DokuFeeType:               getCredential("DOKU_QRIS_FEE_TYPE"),
		DokuQrisExpirySeconds:     parseIntWithDefault(os.Getenv("DOKU_QRIS_EXPIRY_SECONDS"), 300),
		CashPaymentExpirySeconds:  parseIntWithDefault(os.Getenv("CASH_PAYMENT_EXPIRY_SECONDS"), 600),
		OrderPaymentWalletId:      os.Getenv("ORDER_PAYMENT_WALLET_ID"),
		OrderWebBaseURL:           os.Getenv("ORDER_WEB_BASE_URL"),
		OrderPaymentCancelEnabled: parseBoolWithDefault(os.Getenv("ORDER_PAYMENT_CANCEL_ENABLED"), false),

		ExpoPushAccessToken:        getCredential("EXPO_PUSH_ACCESS_TOKEN"),
		KdsPushSound:               stringWithDefault(os.Getenv("KDS_PUSH_SOUND"), "order_alert.wav"),
		KdsDispatchIntervalSeconds: parseIntWithDefault(os.Getenv("KDS_DISPATCH_INTERVAL_SECONDS"), 15),

		FonnteToken:   getCredential("FONNTE_TOKEN"),
		FonnteBaseURL: getCredential("FONNTE_BASE_URL"),

		WhatsappNumberValidationEnabled: parseBoolWithDefault(os.Getenv("WHATSAPP_NUMBER_VALIDATION_ENABLED"), false),
	}
}

// A CI-written .env can leave a credential quoted or newline-terminated, which DOKU rejects as an unknown client.
func getCredential(name string) string {
	return strings.Trim(strings.TrimSpace(os.Getenv(name)), `"'`)
}

func stringWithDefault(raw string, def string) string {
	if raw == "" {
		return def
	}
	return raw
}

// parseBoolWithDefault backs the ORDER_PAYMENT_CANCEL_ENABLED kill switch (D11): unset or
// unparseable is left off rather than defaulting to on.
func parseBoolWithDefault(raw string, def bool) bool {
	if raw == "" {
		return def
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return def
	}
	return value
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
