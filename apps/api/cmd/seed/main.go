package main

import (
	"apps/api/data/mysql"
	"apps/api/pkg/logger"
	"apps/api/seeds"
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

	db, err := mysql.ConnectDB(mysql.ConnectDBParams{
		DbUsername: env.DbUsername,
		DbPassword: env.DbPassword,
		DbHost:     env.DbHost,
		DbPort:     env.DbPort,
		DbName:     env.DbName,
	})
	if err != nil {
		panic("failed to connect database")
	}

	rootLogger.Info("running seeders")
	if err := seeds.RunAll(db, seeds.All()); err != nil {
		panic(fmt.Sprintf("failed to run seeders: %v", err))
	}

	rootLogger.Info("seeders completed successfully")
}
