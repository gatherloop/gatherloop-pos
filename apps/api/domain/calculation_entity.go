package domain

import (
	"time"
)

type Calculation struct {
	Id               int64
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
	CompletedAt      *time.Time
	WalletId         int64
	Wallet           Wallet
	TotalWallet      float32
	TotalCalculation float32
	CalculationItems []CalculationItem
}

type CalculationItem struct {
	Id            int64
	CalculationId int64
	Price         float32
	Amount        int64
	Subtotal      float32
}
