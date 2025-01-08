package mysql

import (
	"apps/api/domain/base"
	"context"
	"errors"
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *base.Error) *base.Error {
	var baseError *base.Error = nil

	repo.db.Transaction(func(tx *gorm.DB) error {
		ctxWithTx := context.WithValue(ctx, "tx", tx)
		baseError = callback(ctxWithTx)
		return errors.New(baseError.Message)
	})

	return baseError
}

func ToSortByColumn(sortBy base.SortBy) string {
	switch sortBy {
	case base.CreatedAt:
		return "created_at"
	default:
		return "created_at"
	}
}

func ToOrderColumn(order base.Order) string {
	switch order {
	case base.Ascending:
		return "asc"
	case base.Descending:
		return "desc"
	default:
		return "asc"
	}
}

func ToError(err error) *base.Error {
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &base.Error{
				Type:    base.NotFound,
				Message: err.Error(),
			}
		} else {
			return &base.Error{Type: base.InternalServerError, Message: err.Error()}
		}
	}

	return nil
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
