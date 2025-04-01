package calculation

import (
	"apps/api/domain/wallet"
	"time"
)

type Calculation struct {
	Id               int64             `json:"id"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
	DeletedAt        *time.Time        `json:"deletedAt"`
	WalletId         int64             `json:"walletId"`
	Wallet           wallet.Wallet     `json:"wallet"`
	TotalWallet      float32           `json:"totalWallet"`
	TotalCalculation float32           `json:"totalCalculation"`
	CalculationItems []CalculationItem `json:"calculationItems"`
}

type CalculationItem struct {
	Id            int64   `json:"id"`
	CalculationId int64   `json:"calculationId"`
	Price         float32 `json:"price"`
	Amount        int64   `json:"amount"`
	Subtotal      float32 `json:"subtotal"`
}
