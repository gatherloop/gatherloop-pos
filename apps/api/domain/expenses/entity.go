package expenses

import (
	"apps/api/domain/budgets"
	"apps/api/domain/wallets"
	"time"
)

type ExpenseItem struct {
	Id        int64   `json:"id"`
	Name      string  `json:"name"`
	Unit      string  `json:"unit"`
	Price     float32 `json:"price"`
	Amount    float32 `json:"amount"`
	Subtotal  float32 `json:"subtotal"`
	ExpenseId int64   `json:"expenseId"`
}

type Expense struct {
	Id           int64          `json:"id"`
	CreatedAt    time.Time      `json:"createdAt"`
	DeletedAt    *time.Time     `json:"deletedAt,omitempty"`
	WalletId     int64          `json:"walletId"`
	Wallet       wallets.Wallet `json:"wallet"`
	BudgetId     int64          `json:"budgetId"`
	Budget       budgets.Budget `json:"budget"`
	Total        float32        `json:"total"`
	ExpenseItems []ExpenseItem  `json:"expenseItems"`
}

type ExpenseItemRequest struct {
	Name   string  `json:"name"`
	Unit   string  `json:"unit"`
	Price  float32 `json:"price"`
	Amount float32 `json:"amount"`
}

type ExpenseRequest struct {
	WalletId     int64                `json:"walletId"`
	BudgetId     int64                `json:"budgetId"`
	ExpenseItems []ExpenseItemRequest `json:"expenseItems"`
}
