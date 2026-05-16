//go:generate mockgen -source=stock_check_repository.go -destination=../data/mock/stock_check_repository.go -package=mock

package domain

import "context"

type StockCheckRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetStockCheckList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]StockCheck, *Error)
	GetStockCheckListTotal(ctx context.Context) (int64, *Error)
	GetStockCheckById(ctx context.Context, id int64) (StockCheck, *Error)
	GetStockCheckByDate(ctx context.Context, checkDate string) (StockCheck, *Error)
	CreateStockCheck(ctx context.Context, stockCheck StockCheck) (StockCheck, *Error)
	UpdateStockCheckById(ctx context.Context, stockCheck StockCheck, id int64) (StockCheck, *Error)
	DeleteStockCheckById(ctx context.Context, id int64) *Error
}
