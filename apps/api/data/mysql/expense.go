package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/expense"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewExpenseRepository(db *gorm.DB) expense.Repository {
	return Repository{db: db}
}

func (repo Repository) GetExpenseList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]expense.Expense, error) {
	var expenses []expense.Expense
	result := repo.db.Table("expenses").Where("deleted_at is NULL").Preload("ExpenseItems").Preload("Wallet").Preload("Budget").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&expenses)

	return expenses, result.Error
}

func (repo Repository) GetExpenseById(ctx context.Context, id int64) (expense.Expense, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var expense expense.Expense
	result := db.Table("expenses").Where("id = ?", id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").First(&expense)
	return expense, result.Error
}

func (repo Repository) CreateExpense(ctx context.Context, expense *expense.Expense) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("expenses").Create(expense)
	return result.Error
}

func (repo Repository) UpdateExpenseById(ctx context.Context, expense *expense.Expense, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("expenses").Where("id = ?", id).Updates(expense)
	return result.Error
}

func (repo Repository) DeleteExpenseById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("expenses").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) DeleteExpenseItems(ctx context.Context, expenseId int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("expense_items").Where("expense_id = ?", expenseId).Delete(expense.ExpenseItem{})
	return result.Error
}

func (repo Repository) CreateExpenseItems(ctx context.Context, expenseItems []expense.ExpenseItem) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("expense_items").Create(expenseItems)
	return result.Error
}
