package expense

import (
	"apps/api/domain/budget"
	"apps/api/domain/wallet"
	"time"
)

type ExpenseItem struct {
	Id        int64
	Name      string
	Unit      string
	Price     float32
	Amount    float32
	Subtotal  float32
	ExpenseId int64
}

type Expense struct {
	Id           int64
	CreatedAt    time.Time
	DeletedAt    *time.Time
	WalletId     int64
	Wallet       wallet.Wallet
	BudgetId     int64
	Budget       budget.Budget
	Total        float32
	ExpenseItems []ExpenseItem
}

type ExpenseItemRequest struct {
	Id     *int64
	Name   string
	Unit   string
	Price  float32
	Amount float32
}

type ExpenseRequest struct {
	WalletId     int64
	BudgetId     int64
	ExpenseItems []ExpenseItemRequest
}
