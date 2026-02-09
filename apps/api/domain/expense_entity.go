package domain

import (
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
	Wallet       Wallet
	BudgetId     int64
	Budget       Budget
	Total        float32
	ExpenseItems []ExpenseItem
}
