package expenses_postgresql

import (
	base_postgresql "apps/api/data/postgresql/base"
	"apps/api/domain/base"
	"apps/api/domain/expenses"
	"apps/api/utils"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) expenses.Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetExpenseList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]expenses.Expense, error) {
	var expenses []expenses.Expense
	result := repo.db.Table("expenses").Where("deleted_at is NULL").Preload("ExpenseItems").Preload("Wallet").Preload("Budget").Order(fmt.Sprintf("%s %s", base_postgresql.ToSortByColumn(sortBy), base_postgresql.ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&expenses)

	return expenses, result.Error
}

func (repo Repository) GetExpenseById(ctx context.Context, id int64) (expenses.Expense, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var expense expenses.Expense
	result := db.Table("expenses").Where("id = ?", id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").First(&expense)
	return expense, result.Error
}

func (repo Repository) CreateExpense(ctx context.Context, expense *expenses.Expense) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("expenses").Create(expense)
	return result.Error
}

func (repo Repository) UpdateExpenseById(ctx context.Context, expense *expenses.Expense, id int64) error {
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
	result := db.Table("expense_items").Where("expense_id = ?", expenseId).Delete(expenses.ExpenseItem{})
	return result.Error
}

func (repo Repository) CreateExpenseItems(ctx context.Context, expenseItems []expenses.ExpenseItem) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("expense_items").Create(expenseItems)
	return result.Error
}
