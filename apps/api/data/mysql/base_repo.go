package mysql

import (
	"apps/api/domain"
	"apps/api/pkg/logger"
	"context"
	"errors"
	"fmt"
	"log/slog"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *domain.Error) *domain.Error {
	var baseError *domain.Error = nil
	log := logger.FromCtx(ctx, slog.Default())

	log.DebugContext(ctx, "transaction begin")

	repo.db.Transaction(func(tx *gorm.DB) error {
		ctxWithTx := context.WithValue(ctx, "tx", tx)
		baseError = callback(ctxWithTx)

		if baseError != nil {
			txErr := errors.New(baseError.Message)
			log.ErrorContext(ctx, "transaction rollback",
				slog.String("reason", txErr.Error()),
			)
			return txErr
		}

		log.DebugContext(ctx, "transaction commit")
		return nil
	})

	return baseError
}

type ConnectDBParams struct {
	DbUsername string
	DbPassword string
	DbHost     string
	DbPort     string
	DbName     string
}

func ConnectDB(params ConnectDBParams) (*gorm.DB, error) {
	return gorm.Open(mysql.Open(fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", params.DbUsername, params.DbPassword, params.DbHost, params.DbPort, params.DbName)))
}

func GetDbFromCtx(ctx context.Context, db *gorm.DB) *gorm.DB {
	tx := ctx.Value("tx")
	if tx != nil {
		return tx.(*gorm.DB)
	}
	return db
}

func BeginDbTransaction(ctx context.Context, db *gorm.DB, callback func(ctxWithTx context.Context) error) error {
	return db.Transaction(func(tx *gorm.DB) error {
		ctxWithTx := context.WithValue(ctx, "tx", tx)
		return callback(ctxWithTx)
	})
}
