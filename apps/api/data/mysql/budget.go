package mysql

import (
	"apps/api/domain/base"
	"apps/api/domain/budget"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewBudgetRepository(db *gorm.DB) budget.Repository {
	return Repository{db: db}
}

func (repo Repository) GetBudgetList(ctx context.Context) ([]budget.Budget, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var budgets []budget.Budget
	result := db.Table("budgets").Where("deleted_at", nil).Find(&budgets)
	return budgets, ToError(result.Error)
}

func (repo Repository) GetBudgetById(ctx context.Context, id int64) (budget.Budget, *base.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var budget budget.Budget
	result := db.Table("budgets").Where("id = ?", id).First(&budget)
	return budget, ToError(result.Error)
}

func (repo Repository) CreateBudget(ctx context.Context, budgetRequest budget.BudgetRequest) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Create(budgetRequest)
	return ToError(result.Error)
}

func (repo Repository) UpdateBudgetById(ctx context.Context, budgetRequest budget.BudgetRequest, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Where("id = ?", id).Updates(budgetRequest)
	return ToError(result.Error)
}

func (repo Repository) DeleteBudgetById(ctx context.Context, id int64) *base.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("budgets").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
