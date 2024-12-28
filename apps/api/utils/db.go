package utils

import (
	"context"
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type ConnectDBParams struct {
	DbUsername string
	DbPassword string
	DbHost     string
	DbPort     string
	DbName     string
}

func ConnectDB(params ConnectDBParams) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai", params.DbHost, params.DbUsername, params.DbPassword, params.DbName, params.DbPort)))
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
