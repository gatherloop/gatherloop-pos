package utils

import (
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() error {
	return godotenv.Load()
}

type Env struct {
	DbUsername  string
	DbPassword  string
	DbName      string
	DbHost      string
	DbPort      string
	Port        string
	JwtSecret   string
	LogLevel    string
	AppEnv      string
	ServiceName string
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
		DbUsername:  os.Getenv("DB_USERNAME"),
		DbPassword:  os.Getenv("DB_PASSWORD"),
		DbName:      os.Getenv("DB_NAME"),
		DbHost:      os.Getenv("DB_HOST"),
		DbPort:      os.Getenv("DB_PORT"),
		Port:        os.Getenv("PORT"),
		JwtSecret:   os.Getenv("JWT_SECRET"),
		LogLevel:    logLevel,
		AppEnv:      appEnv,
		ServiceName: serviceName,
	}
}
