package mysql

import (
	"apps/api/domain/budget"
	"apps/api/utils"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewBudgetRepository(db *gorm.DB) budget.Repository {
	return Repository{db: db}
}

func (repo Repository) GetBudgetList(ctx context.Context) ([]budget.Budget, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var budgets []budget.Budget
	result := db.Table("budgets").Where("deleted_at", nil).Find(&budgets)
	return budgets, result.Error
}

func (repo Repository) GetBudgetById(ctx context.Context, id int64) (budget.Budget, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var budget budget.Budget
	result := db.Table("budgets").Where("id = ?", id).First(&budget)
	return budget, result.Error
}

func (repo Repository) CreateBudget(ctx context.Context, budgetRequest budget.BudgetRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Create(budgetRequest)
	return result.Error
}

func (repo Repository) UpdateBudgetById(ctx context.Context, budgetRequest budget.BudgetRequest, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Where("id = ?", id).Updates(budgetRequest)
	return result.Error
}

func (repo Repository) DeleteBudgetById(ctx context.Context, id int64) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("budgets").Where("id = ?", id).Update("deleted_at", currentTime)
	return result.Error
}
