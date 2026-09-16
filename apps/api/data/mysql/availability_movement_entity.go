package mysql

import "time"

type AvailabilityMovement struct {
	Id                int64
	ProductId         *int64
	VariantId         *int64
	Delta             *int
	ResultingQuantity *int
	Reason            string
	TransactionId     *int64
	Note              string
	CreatedAt         time.Time
}
