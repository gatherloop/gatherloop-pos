package expenses

import (
	"apps/api/modules/budgets"
	"apps/api/modules/wallets"
	"context"
	"errors"
	apiContract "libs/api-contract"
	"time"
)

type Usecase struct {
	repository       Repository
	budgetRepository budgets.Repository
	walletRepository wallets.Repository
}

func NewUsecase(repository Repository, budgetRepository budgets.Repository, walletRepository wallets.Repository) Usecase {
	return Usecase{
		repository:       repository,
		budgetRepository: budgetRepository,
		walletRepository: walletRepository,
	}
}

func (usecase Usecase) GetExpenseList(ctx context.Context, sortBy string, order string, skip int, limit int) ([]apiContract.Expense, error) {
	return usecase.repository.GetExpenseList(ctx, sortBy, order, skip, limit)
}

func (usecase Usecase) GetExpenseById(ctx context.Context, id int64) (apiContract.Expense, error) {
	return usecase.repository.GetExpenseById(ctx, id)
}

func (usecase Usecase) CreateExpense(ctx context.Context, expenseRequest apiContract.ExpenseRequest) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		expense := apiContract.Expense{
			CreatedAt: time.Now(),
			Total:     0,
			WalletId:  expenseRequest.WalletId,
			BudgetId:  expenseRequest.BudgetId,
		}

		err := usecase.repository.CreateExpense(ctxWithTx, &expense)
		if err != nil {
			return err
		}

		var expenseItems []apiContract.ExpenseItem

		for _, item := range expenseRequest.ExpenseItems {
			subTotal := item.Price * item.Amount
			expense.Total += subTotal

			expenseItem := apiContract.ExpenseItem{
				Name:      item.Name,
				Unit:      item.Unit,
				Price:     item.Price,
				Amount:    item.Amount,
				Subtotal:  subTotal,
				ExpenseId: expense.Id,
			}

			expenseItems = append(expenseItems, expenseItem)
		}

		if err := usecase.repository.CreateExpenseItems(ctxWithTx, expenseItems); err != nil {
			return err
		}

		budget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if budget.Balance < expense.Total {
			return errors.New("budget's balance insufficient")
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, apiContract.BudgetRequest{Balance: budget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}

		if wallet.Balance < expense.Total {
			return errors.New("wallet's balance insufficient")
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, apiContract.WalletRequest{Balance: wallet.Balance - expense.Total}, expense.WalletId); err != nil {
			return err
		}

		return usecase.repository.UpdateExpenseById(ctxWithTx, &apiContract.Expense{Total: expense.Total}, expense.Id)
	})
}

func (usecase Usecase) UpdateExpenseById(ctx context.Context, expenseRequest apiContract.ExpenseRequest, id int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		existingExpense, err := usecase.repository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		budget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, apiContract.BudgetRequest{Balance: budget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, apiContract.WalletRequest{Balance: wallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
			return err
		}

		expense := apiContract.Expense{
			CreatedAt: time.Now(),
			Total:     0,
			WalletId:  expenseRequest.WalletId,
			BudgetId:  expenseRequest.BudgetId,
		}

		if err := usecase.repository.DeleteExpenseItems(ctxWithTx, id); err != nil {
			return err
		}

		var expenseItems []apiContract.ExpenseItem

		for _, item := range expenseRequest.ExpenseItems {
			subTotal := item.Price * item.Amount
			expense.Total += subTotal

			expenseItem := apiContract.ExpenseItem{
				Name:      item.Name,
				Unit:      item.Unit,
				Price:     item.Price,
				Amount:    item.Amount,
				Subtotal:  subTotal,
				ExpenseId: id,
			}

			expenseItems = append(expenseItems, expenseItem)
		}

		if err := usecase.repository.CreateExpenseItems(ctxWithTx, expenseItems); err != nil {
			return err
		}

		budget, err = usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if budget.Balance < expense.Total {
			return errors.New("budget's balance insufficient")
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, apiContract.BudgetRequest{Balance: budget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		wallet, err = usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}

		if wallet.Balance < expense.Total {
			return errors.New("wallet's balance insufficient")
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, apiContract.WalletRequest{Balance: wallet.Balance - expense.Total}, expense.WalletId); err != nil {
			return err
		}

		return usecase.repository.UpdateExpenseById(ctxWithTx, &expense, id)
	})
}

func (usecase Usecase) DeleteExpenseById(ctx context.Context, id int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		existingExpense, err := usecase.repository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		budget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, apiContract.BudgetRequest{Balance: budget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, apiContract.WalletRequest{Balance: wallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
			return err
		}

		return usecase.repository.DeleteExpenseById(ctxWithTx, id)
	})
}
