package mysql

import (
	"apps/api/domain"
	"context"
	"errors"
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *domain.Error) *domain.Error {
	var baseError *domain.Error = nil

	repo.db.Transaction(func(tx *gorm.DB) error {
		ctxWithTx := context.WithValue(ctx, "tx", tx)
		baseError = callback(ctxWithTx)

		if baseError != nil {
			return errors.New(baseError.Message)
		}
		return nil
	})

	return baseError
}

func ToSortByColumn(sortBy domain.SortBy) string {
	switch sortBy {
	case domain.CreatedAt:
		return "created_at"
	default:
		return "created_at"
	}
}

func ToOrderColumn(order domain.Order) string {
	switch order {
	case domain.Ascending:
		return "asc"
	case domain.Descending:
		return "desc"
	default:
		return "asc"
	}
}

func ToError(err error) *domain.Error {
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &domain.Error{
				Type:    domain.NotFound,
				Message: err.Error(),
			}
		} else {
			return &domain.Error{Type: domain.InternalServerError, Message: err.Error()}
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
