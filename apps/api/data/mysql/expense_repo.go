package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewExpenseRepository(db *gorm.DB) domain.ExpenseRepository {
	return Repository{db: db}
}

func (repo Repository) GetExpenseList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int, walletId *int, budgetId *int) ([]domain.Expense, *domain.Error) {
	var expenses []Expense
	result := repo.db.Table("expenses").Where("deleted_at is NULL").Preload("ExpenseItems").Preload("Wallet").Preload("Budget").Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	if query != "" {
		result = result.Joins("JOIN expense_items items ON items.expense_id = expenses.id").Where("items.name LIKE ?", "%"+query+"%")
	}

	if walletId != nil {
		result = result.Where("wallet_id = ?", walletId)
	}

	if budgetId != nil {
		result = result.Where("budget_id = ?", budgetId)
	}

	result = result.Find(&expenses)

	return ToExpensesListDomain(expenses), ToError(result.Error)
}

func (repo Repository) GetExpenseListTotal(ctx context.Context, query string, walletId *int, budgetId *int) (int64, *domain.Error) {
	var count int64
	result := repo.db.Table("expenses").Where("deleted_at is NULL")

	if query != "" {
		result = result.Joins("JOIN expense_items items ON items.expense_id = expenses.id").Where("items.name LIKE ?", "%"+query+"%")
	}

	if walletId != nil {
		result = result.Where("wallet_id = ?", walletId)
	}

	if budgetId != nil {
		result = result.Where("budget_id = ?", budgetId)
	}

	result = result.Count(&count)

	return count, ToError(result.Error)
}

func (repo Repository) GetExpenseById(ctx context.Context, id int64) (domain.Expense, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var expense Expense
	result := db.Table("expenses").Where("id = ?", id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").First(&expense)
	return ToExpenseDomain(expense), ToError(result.Error)
}

func (repo Repository) CreateExpense(ctx context.Context, expense domain.Expense) (domain.Expense, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToExpenseDB(expense)
	if result := db.Table("expenses").Create(&payload); result.Error != nil {
		return domain.Expense{}, ToError(result.Error)
	}

	var created Expense
	fetchResult := db.Table("expenses").Where("id = ?", payload.Id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").First(&created)
	return ToExpenseDomain(created), ToError(fetchResult.Error)
}

func (repo Repository) UpdateExpenseById(ctx context.Context, expense domain.Expense, id int64) (domain.Expense, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	expense.Id = id // Ensure the ID is set on the payload to correctly associate items with the parent expense

	// Perform update with full save associations to insert/update items automatically
	expensePayload := ToExpenseDB(expense)
	if result := db.Session(&gorm.Session{FullSaveAssociations: true}).Table("expenses").Where("id = ?", id).Updates(&expensePayload); result.Error != nil {
		return domain.Expense{}, ToError(result.Error)
	}

	// Determine which existing item IDs to keep (those that are present in the incoming payload)
	idsToKeep := []int64{}
	for _, it := range expensePayload.ExpenseItems {
		if it.Id > 0 {
			idsToKeep = append(idsToKeep, it.Id)
		}
	}

	if len(idsToKeep) > 0 {
		// delete items that were present before but are not in the incoming idsToKeep
		if result := db.Table("expense_items").Where("expense_id = ? AND id NOT IN ?", id, idsToKeep).Delete(&ExpenseItem{}); result.Error != nil {
			return domain.Expense{}, ToError(result.Error)
		}
	} else {
		// If incoming payload has no existing IDs, remove all previously existing items
		if result := db.Table("expense_items").Where("expense_id = ?", id).Delete(&ExpenseItem{}); result.Error != nil {
			return domain.Expense{}, ToError(result.Error)
		}
	}

	// Fetch updated record to return complete domain object with all associations
	var updated Expense
	fetchResult := db.Table("expenses").Where("id = ?", id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").First(&updated)
	return ToExpenseDomain(updated), ToError(fetchResult.Error)
}

func (repo Repository) DeleteExpenseById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).Table("expenses").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
