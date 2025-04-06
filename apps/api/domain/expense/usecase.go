package expense

import (
	"apps/api/domain/base"
	"apps/api/domain/budget"
	"apps/api/domain/wallet"
	"context"
	"time"
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

func (usecase Usecase) CreateExpense(ctx context.Context, expenseRequest ExpenseRequest) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		expense := Expense{
			CreatedAt: time.Now(),
			Total:     0,
			WalletId:  expenseRequest.WalletId,
			BudgetId:  expenseRequest.BudgetId,
		}

		err := usecase.repository.CreateExpense(ctxWithTx, &expense)
		if err != nil {
			return err
		}

		var expenseItems []ExpenseItem

		for _, item := range expenseRequest.ExpenseItems {
			subTotal := item.Price * item.Amount
			expense.Total += subTotal

			expenseItem := ExpenseItem{
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

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if expenseBudget.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "budget's balance insufficient"}
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, budget.Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		expenseWallet, walletErr := usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if walletErr != nil {
			return err
		}

		if expenseWallet.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "wallet's balance insufficient"}
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, wallet.WalletRequest{Balance: expenseWallet.Balance - expense.Total}, expense.WalletId); err != nil {
			return err
		}

		return usecase.repository.UpdateExpenseById(ctxWithTx, &Expense{Total: expense.Total}, expense.Id)
	})
}

func (usecase Usecase) UpdateExpenseById(ctx context.Context, expenseRequest ExpenseRequest, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingExpense, err := usecase.repository.GetExpenseById(ctxWithTx, id)
		if err != nil {
			return err
		}

		expenseBudget, err := usecase.budgetRepository.GetBudgetById(ctxWithTx, existingExpense.BudgetId)
		if err != nil {
			return err
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, budget.Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, wallet.WalletRequest{Balance: expenseWallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
			return err
		}

		expense := Expense{
			CreatedAt: time.Now(),
			Total:     0,
			WalletId:  expenseRequest.WalletId,
			BudgetId:  expenseRequest.BudgetId,
		}

		var expenseItems []ExpenseItem

		for _, item := range expenseRequest.ExpenseItems {
			subTotal := item.Price * item.Amount
			expense.Total += subTotal

			var expenseItemId int64
			if item.Id != nil {
				expenseItemId = *item.Id
			}

			expenseItem := ExpenseItem{
				Id:        expenseItemId,
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

		newIds := make(map[int64]bool)
		for _, expenseRequestItem := range expenseRequest.ExpenseItems {
			if expenseRequestItem.Id != nil {
				newIds[*expenseRequestItem.Id] = true
			}
		}

		for _, existingExpenseItem := range existingExpense.ExpenseItems {
			if !newIds[existingExpenseItem.Id] {
				if err := usecase.repository.DeleteExpenseItemById(ctxWithTx, existingExpenseItem.Id); err != nil {
					return err
				}
			}
		}

		expenseBudget, err = usecase.budgetRepository.GetBudgetById(ctxWithTx, expense.BudgetId)
		if err != nil {
			return err
		}

		if expenseBudget.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "budget's balance insufficient"}
		}

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, budget.Budget{Balance: expenseBudget.Balance - expense.Total}, expense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err = usecase.walletRepository.GetWalletById(ctxWithTx, expense.WalletId)
		if err != nil {
			return err
		}

		if expenseWallet.Balance < expense.Total {
			return &base.Error{Type: base.BadRequest, Message: "wallet's balance insufficient"}
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, wallet.WalletRequest{Balance: expenseWallet.Balance - expense.Total}, expense.WalletId); err != nil {
			return err
		}

		return usecase.repository.UpdateExpenseById(ctxWithTx, &expense, id)
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

		if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, budget.Budget{Balance: expenseBudget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
			return err
		}

		expenseWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, existingExpense.WalletId)
		if err != nil {
			return err
		}

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, wallet.WalletRequest{Balance: expenseWallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
			return err
		}

		return usecase.repository.DeleteExpenseById(ctxWithTx, id)
	})
}
