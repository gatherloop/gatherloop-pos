package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewBudgetRepository(db *gorm.DB) domain.BudgetRepository {
	return Repository{db: db}
}

func (repo Repository) GetBudgetList(ctx context.Context) ([]domain.Budget, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var budgets []domain.Budget
	result := db.Table("budgets").Where("deleted_at", nil).Find(&budgets)
	return budgets, ToError(result.Error)
}

func (repo Repository) GetBudgetById(ctx context.Context, id int64) (domain.Budget, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var budget domain.Budget
	result := db.Table("budgets").Where("id = ?", id).First(&budget)
	return budget, ToError(result.Error)
}

func (repo Repository) CreateBudget(ctx context.Context, budget *domain.Budget) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Create(budget)
	return ToError(result.Error)
}

func (repo Repository) UpdateBudgetById(ctx context.Context, budget *domain.Budget, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Where("id = ?", id).Updates(budget)
	return ToError(result.Error)
}

func (repo Repository) DeleteBudgetById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("budgets").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
