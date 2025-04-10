package wallet

import "time"

type WalletRequest struct {
	Name                  string
	Balance               float32
	PaymentCostPercentage float32
}

type Wallet struct {
	Id                    int64
	Name                  string
	Balance               float32
	PaymentCostPercentage float32
	DeletedAt             *time.Time
	CreatedAt             time.Time
}

type WalletTransfer struct {
	Id           int64
	CreatedAt    time.Time
	Amount       float32
	FromWalletId int64
	FromWallet   Wallet
	ToWalletId   int64
	ToWallet     Wallet
	DeletedAt    *time.Time
}

type WalletTransferRequest struct {
	Amount     float32
	ToWalletId int64
}
