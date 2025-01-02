package wallet

import "time"

type WalletRequest struct {
	Name                  string  `json:"name"`
	Balance               float32 `json:"balance"`
	PaymentCostPercentage float32 `json:"paymentCostPercentage"`
}

type Wallet struct {
	Id                    int64      `json:"id"`
	Name                  string     `json:"name"`
	Balance               float32    `json:"balance"`
	PaymentCostPercentage float32    `json:"paymentCostPercentage"`
	DeletedAt             *time.Time `json:"deletedAt,omitempty"`
	CreatedAt             time.Time  `json:"createdAt"`
}

type WalletTransfer struct {
	Id           int64      `json:"id"`
	CreatedAt    time.Time  `json:"createdAt"`
	Amount       float32    `json:"amount"`
	FromWalletId int64      `json:"fromWalletId"`
	FromWallet   Wallet     `json:"fromWallet"`
	ToWalletId   int64      `json:"toWalletId"`
	ToWallet     Wallet     `json:"toWallet"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty"`
}

type WalletTransferRequest struct {
	Amount     float32 `json:"amount"`
	ToWalletId int64   `json:"toWalletId"`
}
