package budgets

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

func (repo Repository) GetBudgetList() ([]apiContract.Budget, error) {
	var budgets []apiContract.Budget
	result := repo.db.Table("budgets").Where("deleted_at", nil).Find(&budgets)
	return budgets, result.Error
}

func (repo Repository) GetBudgetById(id int64) (apiContract.Budget, error) {
	var budget apiContract.Budget
	result := repo.db.Table("budgets").Where("id = ?", id).Find(&budget)
	return budget, result.Error
}

func (repo Repository) CreateBudget(budgetRequest apiContract.BudgetRequest) error {
	result := repo.db.Table("budgets").Create(budgetRequest)
	return result.Error
}

func (repo Repository) UpdateBudgetById(budgetRequest apiContract.BudgetRequest, id int64) error {
	result := repo.db.Table("budgets").Where(apiContract.Budget{Id: id}).Updates(budgetRequest)
	return result.Error
}

func (repo Repository) DeleteBudgetById(id int64) error {
	currentTime := time.Now()
	result := repo.db.Table("budgets").Where(apiContract.Budget{Id: id}).Update("deleted_at", currentTime)
	return result.Error
}
