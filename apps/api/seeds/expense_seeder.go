package seeds

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// ExpenseSeeder seeds sample expenses linked to wallets and budgets, along with their line items.
type ExpenseSeeder struct{}

func (ExpenseSeeder) Name() string { return "ExpenseSeeder" }

func (ExpenseSeeder) Seed(tx *gorm.DB) error {
	type Wallet struct {
		Id   int64
		Name string
	}
	type Budget struct {
		Id   int64
		Name string
	}
	type Expense struct {
		Id        int64
		CreatedAt time.Time
		DeletedAt *time.Time
		WalletId  int64
		BudgetId  int64
		Total     float32
	}
	type ExpenseItem struct {
		Id        int64
		ExpenseId int64
		Name      string
		Unit      string
		Price     float32
		Amount    float32
		Subtotal  float32
	}

	getWalletId := func(name string) (int64, error) {
		var w Wallet
		if err := tx.Table("wallets").Where("name = ?", name).First(&w).Error; err != nil {
			return 0, fmt.Errorf("wallet %q not found: %w", name, err)
		}
		return w.Id, nil
	}

	getBudgetId := func(name string) (int64, error) {
		var b Budget
		if err := tx.Table("budgets").Where("name = ?", name).First(&b).Error; err != nil {
			return 0, fmt.Errorf("budget %q not found: %w", name, err)
		}
		return b.Id, nil
	}

	type expenseItemDef struct {
		Name   string
		Unit   string
		Price  float32
		Amount float32
	}
	type expenseDef struct {
		WalletName string
		BudgetName string
		Items      []expenseItemDef
	}

	expenses := []expenseDef{
		{
			WalletName: "Cash",
			BudgetName: "Operational",
			Items: []expenseItemDef{
				{Name: "Coffee Beans Restock", Unit: "kg", Price: 150000, Amount: 2},
				{Name: "Milk Restock", Unit: "liter", Price: 18000, Amount: 10},
			},
		},
		{
			WalletName: "Cash",
			BudgetName: "Marketing",
			Items: []expenseItemDef{
				{Name: "Banner Printing", Unit: "pcs", Price: 75000, Amount: 2},
				{Name: "Social Media Ads", Unit: "campaign", Price: 200000, Amount: 1},
			},
		},
		{
			WalletName: "GoPay",
			BudgetName: "Operational",
			Items: []expenseItemDef{
				{Name: "Disposable Cups", Unit: "pack", Price: 50000, Amount: 5},
				{Name: "Cup Lids", Unit: "pack", Price: 30000, Amount: 5},
				{Name: "Sugar Restock", Unit: "kg", Price: 14000, Amount: 3},
			},
		},
	}

	// Idempotency: skip if at least as many expenses as defined already exist.
	var existingCount int64
	if err := tx.Table("expenses").Count(&existingCount).Error; err != nil {
		return err
	}
	if existingCount >= int64(len(expenses)) {
		return nil
	}

	for _, ed := range expenses {
		walletId, err := getWalletId(ed.WalletName)
		if err != nil {
			return err
		}
		budgetId, err := getBudgetId(ed.BudgetName)
		if err != nil {
			return err
		}

		var total float32
		for _, item := range ed.Items {
			total += item.Price * item.Amount
		}

		expense := Expense{
			CreatedAt: time.Now(),
			WalletId:  walletId,
			BudgetId:  budgetId,
			Total:     total,
		}
		if err := tx.Table("expenses").Create(&expense).Error; err != nil {
			return err
		}

		for _, id := range ed.Items {
			subtotal := id.Price * id.Amount
			item := ExpenseItem{
				ExpenseId: expense.Id,
				Name:      id.Name,
				Unit:      id.Unit,
				Price:     id.Price,
				Amount:    id.Amount,
				Subtotal:  subtotal,
			}
			if err := tx.Table("expense_items").Create(&item).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
