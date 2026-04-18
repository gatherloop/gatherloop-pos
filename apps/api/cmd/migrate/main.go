package main

import (
	"apps/api/migrations"
	"apps/api/pkg/logger"
	"apps/api/pkg/migrator"
	"apps/api/utils"
	"fmt"
	"log/slog"
)

func main() {
	err := utils.LoadEnv()

	env := utils.GetEnv()

	rootLogger := logger.New(env.ServiceName, env.AppEnv, env.LogLevel)
	slog.SetDefault(rootLogger)

	if err == nil {
		rootLogger.Info("loaded .env file")
	}

	rootLogger.Info("running database migrations")
	if err := migrator.Run(migrator.Params{
		DbUsername:   env.DbUsername,
		DbPassword:   env.DbPassword,
		DbHost:       env.DbHost,
		DbPort:       env.DbPort,
		DbName:       env.DbName,
		MigrationsFS: migrations.FS,
	}); err != nil {
		panic(fmt.Sprintf("failed to run migrations: %v", err))
	}

	rootLogger.Info("migrations completed successfully")
}
