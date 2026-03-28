package seeds

import (
	"time"

	"gorm.io/gorm"
)

// WalletSeeder seeds a cash wallet and a cashless wallet.
type WalletSeeder struct{}

func (WalletSeeder) Name() string { return "WalletSeeder" }

func (WalletSeeder) Seed(tx *gorm.DB) error {
	type Wallet struct {
		Id                    int64
		Name                  string
		Balance               float32
		PaymentCostPercentage float32
		IsCashless            bool
		CreatedAt             time.Time
		DeletedAt             *time.Time
	}

	wallets := []Wallet{
		{
			Name:                  "Cash",
			Balance:               0,
			PaymentCostPercentage: 0,
			IsCashless:            false,
			CreatedAt:             time.Now(),
		},
		{
			Name:                  "GoPay",
			Balance:               0,
			PaymentCostPercentage: 0.5,
			IsCashless:            true,
			CreatedAt:             time.Now(),
		},
	}

	for i := range wallets {
		var count int64
		if err := tx.Table("wallets").Where("name = ?", wallets[i].Name).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("wallets").Create(&wallets[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
