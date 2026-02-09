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
	var budgets []Budget
	result := db.Table("budgets").Where("deleted_at is NULL").Find(&budgets)
	return ToBudgetsListDomain(budgets), ToError(result.Error)
}

func (repo Repository) GetBudgetById(ctx context.Context, id int64) (domain.Budget, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var budget Budget
	result := db.Table("budgets").Where("id = ?", id).First(&budget)
	return ToBudgetDomain(budget), ToError(result.Error)
}

func (repo Repository) CreateBudget(ctx context.Context, budget *domain.Budget) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Create(ToBudgetDB(*budget))
	return ToError(result.Error)
}

func (repo Repository) UpdateBudgetById(ctx context.Context, budget *domain.Budget, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Where("id = ?", id).Updates(ToBudgetDB(*budget))
	return ToError(result.Error)
}

func (repo Repository) DeleteBudgetById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("budgets").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToError(result.Error)
}
