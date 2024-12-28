package budgets_mysql

import (
	"apps/api/domain/budgets"
	"apps/api/utils"
	"context"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) budgets.Repository {
	return Repository{db: db}
}

func (repo Repository) BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) error) error {
	return utils.BeginDbTransaction(ctx, repo.db, callback)
}

func (repo Repository) GetBudgetList(ctx context.Context) ([]budgets.Budget, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var budgets []budgets.Budget
	result := db.Table("budgets").Where("deleted_at", nil).Find(&budgets)
	return budgets, result.Error
}

func (repo Repository) GetBudgetById(ctx context.Context, id int64) (budgets.Budget, error) {
	db := utils.GetDbFromCtx(ctx, repo.db)
	var budget budgets.Budget
	result := db.Table("budgets").Where("id = ?", id).First(&budget)
	return budget, result.Error
}

func (repo Repository) CreateBudget(ctx context.Context, budgetRequest budgets.BudgetRequest) error {
	db := utils.GetDbFromCtx(ctx, repo.db)
	result := db.Table("budgets").Create(budgetRequest)
	return result.Error
}

func (repo Repository) UpdateBudgetById(ctx context.Context, budgetRequest budgets.BudgetRequest, id int64) error {
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
