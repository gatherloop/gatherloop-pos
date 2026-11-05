package domain

import (
	"context"
	"time"
)

type ExpenseUsecase struct {
	expenseRepoPort ExpenseRepoPort
	budgetRepoPort  BudgetRepoPort
	walletRepoPort  WalletRepoPort
}

func NewExpenseUsecase(expenseRepoPort ExpenseRepoPort, budgetRepoPort BudgetRepoPort, walletRepoPort WalletRepoPort) ExpenseUsecase {
	return ExpenseUsecase{
		expenseRepoPort: expenseRepoPort,
		budgetRepoPort:  budgetRepoPort,
		walletRepoPort:  walletRepoPort,
	}
}

func (usecase ExpenseUsecase) GetExpenseList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, walletId *int, budgetId *int) ([]Expense, int64, *Error) {
	expenses, err := usecase.expenseRepoPort.GetExpenseList(ctx, query, sortBy, order, skip, limit, walletId, budgetId)
	if err != nil {
		return []Expense{}, 0, err
	}

	total, err := usecase.expenseRepoPort.GetExpenseListTotal(ctx, query, walletId, budgetId)
	if err != nil {
		return []Expense{}, 0, err
	}

	return expenses, total, nil
}

func (usecase ExpenseUsecase) GetExpenseById(ctx context.Context, id int64) (Expense, *Error) {
	return usecase.expenseRepoPort.GetExpenseById(ctx, id)
}

func (usecase ExpenseUsecase) CreateExpense(ctx context.Context, expense Expense) (Expense, *Error) {
	var created Expense
	err := usecase.expenseRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		expenseBudget, err := usecase.budgetRepoPort.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}
		if expenseBudget.DeletedAt != nil {
			return &Error{Type: NotFound, Message: "budget not found"}
		}

		expenseWallet, walletErr := usecase.walletRepoPort.GetWalletById(ctxWithTx, expense.WalletId)
		if walletErr != nil {
			return walletErr
		}
		if expenseWallet.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "wallet's balance insufficient"}
		}
		if _, err := usecase.walletRepoPort.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance - expense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
			IsPaymentTarget:       expenseWallet.IsPaymentTarget,
		}, expense.WalletId); err != nil {
			return err
		}

		createdExpense, err := usecase.expenseRepoPort.CreateExpense(ctxWithTx, expense)
		if err != nil {
			return err
		}
		created = createdExpense

		return nil
	})
	return created, err
}

func (usecase ExpenseUsecase) UpdateExpenseById(ctx context.Context, expense Expense, id int64) (Expense, *Error) {
	var updatedResult Expense
	err := usecase.expenseRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingExpense, err := usecase.expenseRepoPort.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepoPort.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}
		if expenseBudget.DeletedAt != nil {
			return &Error{Type: NotFound, Message: "budget not found"}
		}

		expenseWallet, err := usecase.walletRepoPort.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}
		if _, err := usecase.walletRepoPort.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance + existingExpense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
			IsPaymentTarget:       expenseWallet.IsPaymentTarget,
		}, existingExpense.WalletId); err != nil {
			return err
		}

		expenseWallet, err = usecase.walletRepoPort.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}
		if expenseWallet.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "wallet's balance insufficient"}
		}
		if _, err := usecase.walletRepoPort.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance - expense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
			IsPaymentTarget:       expenseWallet.IsPaymentTarget,
		}, expense.WalletId); err != nil {
			return err
		}

		updated, err := usecase.expenseRepoPort.UpdateExpenseById(ctxWithTx, expense, id)
		if err != nil {
			return err
		}

		updatedResult = updated
		return nil
	})

	return updatedResult, err
}

func (usecase ExpenseUsecase) DeleteExpenseById(ctx context.Context, id int64) *Error {
	return usecase.expenseRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingExpense, err := usecase.expenseRepoPort.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepoPort.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if _, err := usecase.walletRepoPort.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance + existingExpense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
			IsPaymentTarget:       expenseWallet.IsPaymentTarget,
		}, existingExpense.WalletId); err != nil {
			return err
		}

		return usecase.expenseRepoPort.DeleteExpenseById(ctxWithTx, id)
	})
}

func (usecase ExpenseUsecase) GetExpenseStatistics(ctx context.Context, groupBy string, startDate *time.Time, endDate *time.Time) ([]ExpenseStatistic, *Error) {
	if startDate != nil && endDate != nil && startDate.After(*endDate) {
		return []ExpenseStatistic{}, &Error{Type: BadRequest, Message: "startDate must be on or before endDate"}
	}

	return usecase.expenseRepoPort.GetExpenseStatistics(ctx, groupBy, startDate, endDate)
}
