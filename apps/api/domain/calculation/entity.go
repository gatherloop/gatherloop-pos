package calculation

import (
	"apps/api/domain/wallet"
	"time"
)

type Calculation struct {
	Id               int64
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
	WalletId         int64
	Wallet           wallet.Wallet
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
