package expenses

import (
	apiContract "libs/api-contract"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return Repository{db: db}
}

func (repo Repository) GetExpenseList() ([]apiContract.Expense, error) {
	var expenses []apiContract.Expense
	result := repo.db.Table("expenses").Where("deleted_at is NULL").Preload("ExpenseItems").Preload("Wallet").Preload("Budget").Find(&expenses)
	return expenses, result.Error
}

func (repo Repository) GetExpenseById(id int64) (apiContract.Expense, error) {
	var expense apiContract.Expense
	result := repo.db.Table("expenses").Where("id = ?", id).Preload("ExpenseItems").Preload("Wallet").Preload("Budget").Find(&expense)
	return expense, result.Error
}

func (repo Repository) CreateExpense(expense *apiContract.Expense) error {
	result := repo.db.Table("expenses").Create(expense)
	return result.Error
}

func (repo Repository) UpdateExpenseById(expense *apiContract.Expense, id int64) error {
	result := repo.db.Table("expenses").Where(apiContract.Expense{Id: id}).Updates(expense)
	return result.Error
}

func (repo Repository) DeleteExpenseById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("expenses").Where(apiContract.Expense{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}

func (repo Repository) DeleteExpenseItems(expenseId int64) error {
	result := repo.db.Table("expense_items").Where("expense_id = ?", expenseId).Delete(apiContract.ExpenseItem{})
	return result.Error
}

func (repo Repository) CreateExpenseItem(expenseItem *apiContract.ExpenseItem) error {
	result := repo.db.Table("expense_items").Create(expenseItem)
	return result.Error
}