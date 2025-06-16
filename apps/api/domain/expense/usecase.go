package expense

import (
	"apps/api/domain/base"
	"apps/api/domain/budget"
	"apps/api/domain/wallet"
	"context"
)

type Usecase struct {
	repository       Repository
	budgetRepository budget.Repository
	walletRepository wallet.Repository
}

func NewUsecase(repository Repository, budgetRepository budget.Repository, walletRepository wallet.Repository) Usecase {
	return Usecase{
		repository:       repository,
		budgetRepository: budgetRepository,
		walletRepository: walletRepository,
	}
}

func (usecase Usecase) GetExpenseList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Expense, *base.Error) {
	return usecase.repository.GetExpenseList(ctx, sortBy, order, skip, limit)
}

func (usecase Usecase) GetExpenseById(ctx context.Context, id int64) (Expense, *base.Error) {
	return usecase.repository.GetExpenseById(ctx, id)
}

func (usecase Usecase) CreateExpense(ctx context.Context, expense Expense) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		err := usecase.repository.CreateExpense(ctxWithTx, &expense)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if expenseBudget.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "budget's balance insufficient"}
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &budget.Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		expenseWallet, walletErr := usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if walletErr != nil {
			return err
		}

		if expenseWallet.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "wallet's balance insufficient"}
		}

		return usecase.walletRepository.UpdateWalletById(ctxWithTx, &wallet.Wallet{Balance: expenseWallet.Balance - expense.Total}, expense.WalletId)
	})
}

func (usecase Usecase) UpdateExpenseById(ctx context.Context, expense Expense, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingExpense, err := usecase.repository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &budget.Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &wallet.Wallet{Balance: expenseWallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
			return err
		}

		expenseBudget, err = usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if expenseBudget.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "budget's balance insufficient"}
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &budget.Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err = usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}

		if expenseWallet.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "wallet's balance insufficient"}
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &wallet.Wallet{Balance: expenseWallet.Balance - expense.Total}, expense.WalletId); err != nil {
			return err
		}

		for i := range expense.ExpenseItems {
			expense.ExpenseItems[i].ExpenseId = id
		}

		if err := usecase.repository.UpdateExpenseById(ctxWithTx, &expense, id); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, item := range expense.ExpenseItems {
			newIds[item.Id] = true
		}

		for _, existingExpenseItem := range existingExpense.ExpenseItems {
			if !newIds[existingExpenseItem.Id] {
				if err := usecase.repository.DeleteExpenseItemById(ctxWithTx, existingExpenseItem.Id); err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (usecase Usecase) DeleteExpenseById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingExpense, err := usecase.repository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &budget.Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &wallet.Wallet{Balance: expenseWallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
			return err
		}

		return usecase.repository.DeleteExpenseById(ctxWithTx, id)
	})
}
