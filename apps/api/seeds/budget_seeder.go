package seeds

import (
	"time"

	"gorm.io/gorm"
)

// BudgetSeeder seeds sample operational budgets.
type BudgetSeeder struct{}

func (BudgetSeeder) Name() string { return "BudgetSeeder" }

func (BudgetSeeder) Seed(tx *gorm.DB) error {
	type Budget struct {
		Id         int64
		Name       string
		Percentage float32
		Balance    float32
		CreatedAt  time.Time
		DeletedAt  *time.Time
	}

	budgets := []Budget{
		{Name: "Operational", Percentage: 60, Balance: 0, CreatedAt: time.Now()},
		{Name: "Marketing", Percentage: 20, Balance: 0, CreatedAt: time.Now()},
		{Name: "Savings", Percentage: 20, Balance: 0, CreatedAt: time.Now()},
	}

	for i := range budgets {
		var count int64
		if err := tx.Table("budgets").Where("name = ?", budgets[i].Name).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := tx.Table("budgets").Create(&budgets[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
