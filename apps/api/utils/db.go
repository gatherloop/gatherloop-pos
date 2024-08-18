package utils

import (
	"context"
	"fmt"

	"gorm.io/driver/mysql"
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
