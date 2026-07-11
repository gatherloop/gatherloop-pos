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
		CreatedAt  time.Time
		DeletedAt  *time.Time
	}

	// Targets are expressed as % of revenue for the reporting period, not
	// shares of allocated income, and are not required to sum to 100 — the
	// remainder is the implied target profit margin.
	budgets := []Budget{
		{Name: "Restock", Percentage: 30, CreatedAt: time.Now()},
		{Name: "Operational", Percentage: 25, CreatedAt: time.Now()},
		{Name: "Salary", Percentage: 20, CreatedAt: time.Now()},
		{Name: "Savings", Percentage: 10, CreatedAt: time.Now()},
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
