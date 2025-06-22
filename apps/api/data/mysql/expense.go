package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/expense"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewExpenseRepository(db *gorm.DB) expense.Repository {
	return Repository{db: db}
}

func (repo Repository) GetExpenseList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]expense.Expense, *base.Error) {
	var expenses []expense.Expense
	result := repo.db.Table("expenses").Where("deleted_at is NULL").Preload("ExpenseItems").Preload("Wallet").Preload("Budget").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&expenses)

	return expenses, ToError(result.Error)
}

func (repo Repository) GetExpenseById(ctx context.Context, id int64) (expense.Expense, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var expense expense.Expense
	result := db.Table("expenses").Where("id = ?", id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").First(&expense)
	return expense, ToError(result.Error)
}

func (repo Repository) CreateExpense(ctx context.Context, expense *expense.Expense) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("expenses").Create(expense)
	return ToError(result.Error)
}

func (repo Repository) UpdateExpenseById(ctx context.Context, expense *expense.Expense, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)

	if result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("expense_items").Create(expense.ExpenseItems); result != nil {
		return ToError(result.Error)
	}

	result := db.Table("expenses").Where("id = ?", id).Updates(expense)
	return ToError(result.Error)
}

func (repo Repository) DeleteExpenseById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("expenses").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}

func (repo Repository) DeleteExpenseItemById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("expense_items").Where("id = ?", id).Delete(&expense.ExpenseItem{})
	return ToError(result.Error)
}
