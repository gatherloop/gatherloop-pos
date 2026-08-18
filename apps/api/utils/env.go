package utils

import (
	"os"
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
	}
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
