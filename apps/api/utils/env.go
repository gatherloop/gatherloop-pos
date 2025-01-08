package utils

import (
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() error {
	return godotenv.Load()
}

type Env struct {
	DbUsername string
	DbPassword string
	DbName     string
	DbHost     string
	DbPort     string
	Port       string
	JwtSecret  string
}

func GetEnv() Env {
	return Env{
		DbUsername: os.Getenv("DB_USERNAME"),
		DbPassword: os.Getenv("DB_PASSWORD"),
		DbName:     os.Getenv("DB_NAME"),
		DbHost:     os.Getenv("DB_HOST"),
		DbPort:     os.Getenv("DB_PORT"),
		Port:       os.Getenv("PORT"),
		JwtSecret:  os.Getenv("JWT_SECRET"),
	}
}
