package transactions

import (
	"apps/api/domain/products"
	"apps/api/domain/wallets"
	"time"
)

type TransactionItem struct {
	Id            int64            `json:"id"`
	TransactionId int64            `json:"transactionId"`
	ProductId     int64            `json:"productId"`
	Product       products.Product `json:"product"`
	Amount        float32          `json:"amount"`
	Price         float32          `json:"price"`
	Subtotal      float32          `json:"subtotal"`
}

type Transaction struct {
	Id               int64             `json:"id"`
	CreatedAt        time.Time         `json:"createdAt"`
	Name             string            `json:"name"`
	WalletId         *int64            `json:"walletId,omitempty"`
	Wallet           *wallets.Wallet   `json:"wallet,omitempty"`
	Total            float32           `json:"total"`
	TotalIncome      float32           `json:"totalIncome"`
	TransactionItems []TransactionItem `json:"transactionItems"`
	PaidAt           *time.Time        `json:"paidAt,omitempty"`
	DeletedAt        *time.Time        `json:"deletedAt,omitempty"`
}

type TransactionStatistic struct {
	Date        string  `json:"date"`
	Total       float32 `json:"total"`
	TotalIncome float32 `json:"totalIncome"`
}

type TransactionRequest struct {
	Name             string                   `json:"name"`
	TransactionItems []TransactionItemRequest `json:"transactionItems"`
}

type TransactionItemRequest struct {
	ProductId int64   `json:"productId"`
	Amount    float32 `json:"amount"`
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
