package transactionCategory

import (
	"apps/api/domain/product"
	"time"
)

type TransactionCategory struct {
	Id                int64
	Name              string
	CreatedAt         time.Time
	DeletedAt         *time.Time
	CheckoutProductId *int64
	CheckoutProduct   *product.Product
}
