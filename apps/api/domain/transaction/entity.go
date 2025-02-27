package transaction

import (
	"apps/api/domain/product"
	"apps/api/domain/wallet"
	"time"
)

type TransactionItem struct {
	Id             int64           `json:"id"`
	TransactionId  int64           `json:"transactionId"`
	ProductId      int64           `json:"productId"`
	Product        product.Product `json:"product"`
	Amount         float32         `json:"amount"`
	Price          float32         `json:"price"`
	DiscountAmount float32         `json:"discountAmount"`
	Subtotal       float32         `json:"subtotal"`
}

type Transaction struct {
	Id               int64             `json:"id"`
	CreatedAt        time.Time         `json:"createdAt"`
	Name             string            `json:"name"`
	WalletId         *int64            `json:"walletId,omitempty"`
	Wallet           *wallet.Wallet    `json:"wallet,omitempty"`
	Total            float32           `json:"total"`
	TotalIncome      float32           `json:"totalIncome"`
	TransactionItems []TransactionItem `json:"transactionItems"`
	PaidAt           *time.Time        `json:"paidAt,omitempty"`
	DeletedAt        *time.Time        `json:"deletedAt,omitempty"`
}

type TransactionStatistic struct {
	Date        string  `json:"date"`
	Total       int32   `json:"total"`
	TotalIncome float32 `json:"totalIncome"`
}

type TransactionRequest struct {
	Name             string                   `json:"name"`
	TransactionItems []TransactionItemRequest `json:"transactionItems"`
}

type TransactionItemRequest struct {
	Id             *int64  `json:"id"`
	ProductId      int64   `json:"productId"`
	Amount         float32 `json:"amount"`
	DiscountAmount float32 `json:"discountAmount"`
}

type TransactionPayRequest struct {
	WalletId int64 `json:"walletId"`
}

type PaymentStatus int

const (
	Paid PaymentStatus = iota
	Unpaid
	All
)
