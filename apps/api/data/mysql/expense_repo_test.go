package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// createExpenseAt creates an expense via the repository and then backdates
// its created_at with a raw UPDATE, since CreateExpense always stamps "now"
// and the statistics tests need deterministic, spread-out dates.
func createExpenseAt(t *testing.T, db *gorm.DB, expenseRepo domain.ExpenseRepository, budgetId int64, walletId int64, total float32, createdAt time.Time) int64 {
	t.Helper()

	created, err := expenseRepo.CreateExpense(context.Background(), domain.Expense{BudgetId: budgetId, WalletId: walletId, Total: total})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM expenses WHERE id = ?", created.Id) })

	require.NoError(t, db.Exec("UPDATE expenses SET created_at = ? WHERE id = ?", createdAt, created.Id).Error)

	return created.Id
}

// TestExpenseRepository_GetExpenseStatistics_RangeOrderingAndSplit covers
// Phase 1 of the expense statistics PRD (FR-1/FR-2/D9): chronological (not
// string) ordering across a year boundary, correct per-budget summation
// within a period, bounded ranges, and inclusive endDate.
func TestExpenseRepository_GetExpenseStatistics_RangeOrderingAndSplit(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	budgetRepo := mysql.NewBudgetRepository(db)
	walletRepo := mysql.NewWalletRepository(db)
	expenseRepo := mysql.NewExpenseRepository(db)

	wallet, err := walletRepo.CreateWallet(ctx, domain.Wallet{Name: "Stats Wallet"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM wallets WHERE id = ?", wallet.Id) })

	restock, err := budgetRepo.CreateBudget(ctx, domain.Budget{Name: "Stats Restock"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM budgets WHERE id = ?", restock.Id) })

	salary, err := budgetRepo.CreateBudget(ctx, domain.Budget{Name: "Stats Salary"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM budgets WHERE id = ?", salary.Id) })

	createExpenseAt(t, db, expenseRepo, restock.Id, wallet.Id, 100, time.Date(2024, 12, 15, 10, 0, 0, 0, time.Local))
	createExpenseAt(t, db, expenseRepo, restock.Id, wallet.Id, 200, time.Date(2025, 1, 10, 10, 0, 0, 0, time.Local))
	createExpenseAt(t, db, expenseRepo, restock.Id, wallet.Id, 300, time.Date(2025, 1, 20, 23, 59, 0, 0, time.Local))
	createExpenseAt(t, db, expenseRepo, salary.Id, wallet.Id, 500, time.Date(2025, 1, 15, 10, 0, 0, 0, time.Local))
	createExpenseAt(t, db, expenseRepo, restock.Id, wallet.Id, 400, time.Date(2025, 2, 5, 10, 0, 0, 0, time.Local))

	t.Run("month grouping orders chronologically across year boundary", func(t *testing.T) {
		stats, err := expenseRepo.GetExpenseStatistics(ctx, "month", nil, nil)
		require.Nil(t, err)

		decIndex, janIndex := -1, -1
		for i, s := range stats {
			if s.Date == "12-2024" && s.BudgetId == restock.Id {
				decIndex = i
			}
			if s.Date == "01-2025" && s.BudgetId == restock.Id {
				janIndex = i
			}
		}
		require.NotEqual(t, -1, decIndex, "expected 12-2024/restock in results")
		require.NotEqual(t, -1, janIndex, "expected 01-2025/restock in results")
		assert.Less(t, decIndex, janIndex, "12-2024 must come before 01-2025 in real chronological order")
	})

	t.Run("per-budget split sums correctly within a period", func(t *testing.T) {
		stats, err := expenseRepo.GetExpenseStatistics(ctx, "month", nil, nil)
		require.Nil(t, err)

		var restockJanTotal, salaryJanTotal float32
		for _, s := range stats {
			if s.Date != "01-2025" {
				continue
			}
			switch s.BudgetId {
			case restock.Id:
				restockJanTotal = s.Total
				assert.Equal(t, restock.Name, s.BudgetName)
			case salary.Id:
				salaryJanTotal = s.Total
				assert.Equal(t, salary.Name, s.BudgetName)
			}
		}
		assert.Equal(t, float32(500), restockJanTotal, "expected the two January restock expenses (200 + 300)")
		assert.Equal(t, float32(500), salaryJanTotal, "expected the single January salary expense")
	})

	t.Run("bounded range excludes rows outside the window", func(t *testing.T) {
		startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local)
		endDate := time.Date(2025, 1, 31, 0, 0, 0, 0, time.Local)

		stats, err := expenseRepo.GetExpenseStatistics(ctx, "date", &startDate, &endDate)
		require.Nil(t, err)

		var total float32
		for _, s := range stats {
			total += s.Total
		}
		assert.Equal(t, float32(1000), total, "expected only the three January expenses (200 + 300 + 500)")
	})

	t.Run("inclusive endDate includes the whole day", func(t *testing.T) {
		startDate := time.Date(2025, 1, 20, 0, 0, 0, 0, time.Local)
		endDate := time.Date(2025, 1, 20, 0, 0, 0, 0, time.Local)

		stats, err := expenseRepo.GetExpenseStatistics(ctx, "date", &startDate, &endDate)
		require.Nil(t, err)

		var total float32
		for _, s := range stats {
			total += s.Total
		}
		assert.Equal(t, float32(300), total, "endDate=2025-01-20 must include the 23:59 expense on that day")
	})
}

// TestExpenseRepository_GetExpenseStatistics_ExcludesDeletedExpenses covers
// D7: deleted *expenses* stay excluded even though deleted *budgets* don't.
func TestExpenseRepository_GetExpenseStatistics_ExcludesDeletedExpenses(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	budgetRepo := mysql.NewBudgetRepository(db)
	walletRepo := mysql.NewWalletRepository(db)
	expenseRepo := mysql.NewExpenseRepository(db)

	wallet, err := walletRepo.CreateWallet(ctx, domain.Wallet{Name: "Deleted Expense Wallet"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM wallets WHERE id = ?", wallet.Id) })

	budget, err := budgetRepo.CreateBudget(ctx, domain.Budget{Name: "Deleted Expense Budget"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM budgets WHERE id = ?", budget.Id) })

	createdAt := time.Date(2025, 3, 10, 10, 0, 0, 0, time.Local)
	createExpenseAt(t, db, expenseRepo, budget.Id, wallet.Id, 700, createdAt)
	deletedId := createExpenseAt(t, db, expenseRepo, budget.Id, wallet.Id, 900, createdAt)

	require.Nil(t, expenseRepo.DeleteExpenseById(ctx, deletedId))

	stats, err := expenseRepo.GetExpenseStatistics(ctx, "month", nil, nil)
	require.Nil(t, err)

	var total float32
	for _, s := range stats {
		if s.Date == "03-2025" && s.BudgetId == budget.Id {
			total = s.Total
		}
	}
	assert.Equal(t, float32(700), total, "soft-deleted expense must be excluded from the sum")
}

// TestExpenseRepository_GetExpenseStatistics_IncludesSoftDeletedBudgetHistory
// covers D7: deleting a budget must not silently erase past spend from
// reports — the expense keeps appearing under the budget's original name.
func TestExpenseRepository_GetExpenseStatistics_IncludesSoftDeletedBudgetHistory(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	budgetRepo := mysql.NewBudgetRepository(db)
	walletRepo := mysql.NewWalletRepository(db)
	expenseRepo := mysql.NewExpenseRepository(db)

	wallet, err := walletRepo.CreateWallet(ctx, domain.Wallet{Name: "Soft Deleted Budget Wallet"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM wallets WHERE id = ?", wallet.Id) })

	budget, err := budgetRepo.CreateBudget(ctx, domain.Budget{Name: "Soon Retired Budget"})
	require.Nil(t, err)
	t.Cleanup(func() { db.Exec("DELETE FROM budgets WHERE id = ?", budget.Id) })

	createExpenseAt(t, db, expenseRepo, budget.Id, wallet.Id, 250, time.Date(2025, 4, 1, 10, 0, 0, 0, time.Local))

	require.Nil(t, budgetRepo.DeleteBudgetById(ctx, budget.Id))

	stats, err := expenseRepo.GetExpenseStatistics(ctx, "month", nil, nil)
	require.Nil(t, err)

	found := false
	for _, s := range stats {
		if s.Date == "04-2025" && s.BudgetId == budget.Id {
			found = true
			assert.Equal(t, budget.Name, s.BudgetName)
			assert.Equal(t, float32(250), s.Total)
		}
	}
	assert.True(t, found, "expense under a soft-deleted budget must still appear, under its original name")
}
