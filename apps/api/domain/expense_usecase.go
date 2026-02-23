package domain

import (
	"context"
)

type ExpenseUsecase struct {
	expenseRepository ExpenseRepository
	budgetRepository  BudgetRepository
	walletRepository  WalletRepository
}

func NewExpenseUsecase(expenseRepository ExpenseRepository, budgetRepository BudgetRepository, walletRepository WalletRepository) ExpenseUsecase {
	return ExpenseUsecase{
		expenseRepository: expenseRepository,
		budgetRepository:  budgetRepository,
		walletRepository:  walletRepository,
	}
}

func (usecase ExpenseUsecase) GetExpenseList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, walletId *int, budgetId *int) ([]Expense, int64, *Error) {
	expenses, err := usecase.expenseRepository.GetExpenseList(ctx, query, sortBy, order, skip, limit, walletId, budgetId)
	if err != nil {
		return []Expense{}, 0, err
	}

	total, err := usecase.expenseRepository.GetExpenseListTotal(ctx, query, walletId, budgetId)
	if err != nil {
		return []Expense{}, 0, err
	}

	return expenses, total, nil
}

func (usecase ExpenseUsecase) GetExpenseById(ctx context.Context, id int64) (Expense, *Error) {
	return usecase.expenseRepository.GetExpenseById(ctx, id)
}

func (usecase ExpenseUsecase) CreateExpense(ctx context.Context, expense Expense) (Expense, *Error) {
	var created Expense
	err := usecase.expenseRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// Check if the budget have sufficient balance before creating the expense, and update it's balance accordingly
		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}
		if expenseBudget.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "budget's balance insufficient"}
		}
		if _, err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		// Check if the wallet have sufficient balance before creating the expense, and update it's balance accordingly
		expenseWallet, walletErr := usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if walletErr != nil {
			return walletErr
		}
		if expenseWallet.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "wallet's balance insufficient"}
		}
		if _, err := usecase.walletRepository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance - expense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, expense.WalletId); err != nil {
			return err
		}

		createdExpense, err := usecase.expenseRepository.CreateExpense(ctxWithTx, expense)
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
	err := usecase.expenseRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingExpense, err := usecase.expenseRepository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		// Refund the old budget balance with the existing expense's total
		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}
		if _, err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		// Refund the old wallet balance with the existing expense's total
		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}
		if _, err := usecase.walletRepository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance + existingExpense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, existingExpense.WalletId); err != nil {
			return err
		}

		// Check if the new budget have sufficient balance and update it's balance accordingly
		expenseBudget, err = usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}
		if expenseBudget.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "budget's balance insufficient"}
		}
		if _, err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		// Check if the new wallet have sufficient balance and update it's balance accordingly
		expenseWallet, err = usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}
		if expenseWallet.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "wallet's balance insufficient"}
		}
		if _, err := usecase.walletRepository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance - expense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, expense.WalletId); err != nil {
			return err
		}

		// Update the expense with the new data
		updated, err := usecase.expenseRepository.UpdateExpenseById(ctxWithTx, expense, id)
		if err != nil {
			return err
		}

		updatedResult = updated
		return nil
	})

	return updatedResult, err
}

func (usecase ExpenseUsecase) DeleteExpenseById(ctx context.Context, id int64) *Error {
	return usecase.expenseRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingExpense, err := usecase.expenseRepository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if _, err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if _, err := usecase.walletRepository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance + existingExpense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, existingExpense.WalletId); err != nil {
			return err
		}

		return usecase.expenseRepository.DeleteExpenseById(ctxWithTx, id)
	})
}
