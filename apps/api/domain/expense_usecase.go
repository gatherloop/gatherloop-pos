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

func (usecase ExpenseUsecase) CreateExpense(ctx context.Context, expense Expense) *Error {
	return usecase.expenseRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		err := usecase.expenseRepository.CreateExpense(ctxWithTx, &expense)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if expenseBudget.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "budget's balance insufficient"}
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		expenseWallet, walletErr := usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if walletErr != nil {
			return err
		}

		if expenseWallet.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "wallet's balance insufficient"}
		}

		return usecase.walletRepository.UpdateWalletById(ctxWithTx, &Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance - expense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, expense.WalletId)
	})
}

func (usecase ExpenseUsecase) UpdateExpenseById(ctx context.Context, expense Expense, id int64) *Error {
	return usecase.expenseRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingExpense, err := usecase.expenseRepository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance + existingExpense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, existingExpense.WalletId); err != nil {
			return err
		}

		expenseBudget, err = usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if expenseBudget.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "budget's balance insufficient"}
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err = usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}

		if expenseWallet.Balance < expense.Total {
			return &Error{Type: BadRequest, Message: "wallet's balance insufficient"}
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &Wallet{
			Name:                  expenseWallet.Name,
			Balance:               expenseWallet.Balance - expense.Total,
			PaymentCostPercentage: expenseWallet.PaymentCostPercentage,
			IsCashless:            expenseWallet.IsCashless,
		}, expense.WalletId); err != nil {
			return err
		}

		for i := range expense.ExpenseItems {
			expense.ExpenseItems[i].ExpenseId = id
		}

		expense.Id = id
		if err := usecase.expenseRepository.UpdateExpenseById(ctxWithTx, &expense, id); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, item := range expense.ExpenseItems {
			newIds[item.Id] = true
		}

		for _, existingExpenseItem := range existingExpense.ExpenseItems {
			if !newIds[existingExpenseItem.Id] {
				if err := usecase.expenseRepository.DeleteExpenseItemById(ctxWithTx, existingExpenseItem.Id); err != nil {
					return err
				}
			}
		}

		return nil
	})
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

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &Wallet{
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
