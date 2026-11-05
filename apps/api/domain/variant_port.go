//go:generate mockgen -source=variant_port.go -destination=../data/mock/variant_port.go -package=mock

package domain

import (
	"context"
)

type VariantRepoPort interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetVariantList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, productId *int, optionValues []int) ([]Variant, *Error)
	GetVariantListTotal(ctx context.Context, query string) (int64, *Error)
	GetVariantById(ctx context.Context, id int64) (Variant, *Error)
	CreateVariant(ctx context.Context, variant Variant) (Variant, *Error)
	UpdateVariantById(ctx context.Context, variant Variant, id int64) (Variant, *Error)
	DeleteVariantById(ctx context.Context, id int64) *Error
	ClearAvailableQuantityByProductId(ctx context.Context, productId int64) *Error
}
