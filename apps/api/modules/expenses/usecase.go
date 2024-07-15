package expenses

import (
	"apps/api/modules/budgets"
	"apps/api/modules/wallets"
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

func (usecase Usecase) GetExpenseList() ([]apiContract.Expense, error) {
	return usecase.repository.GetExpenseList()
}

func (usecase Usecase) GetExpenseById(id int64) (apiContract.Expense, error) {
	return usecase.repository.GetExpenseById(id)
}

func (usecase Usecase) CreateExpense(expenseRequest apiContract.ExpenseRequest) error {
	expense := apiContract.Expense{
		CreatedAt: time.Now(),
		Total:     0,
		WalletId:  expenseRequest.WalletId,
		BudgetId:  expenseRequest.BudgetId,
	}

	err := usecase.repository.CreateExpense(&expense)
	if err != nil {
		return err
	}

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

		if err := usecase.repository.CreateExpenseItem(&expenseItem); err != nil {
			return err
		}
	}

	budget, err := usecase.budgetRepository.GetBudgetById(expense.BudgetId)
	if err != nil {
		return err
	}

	if budget.Balance < expense.Total {
		return errors.New("budget's balance insufficient")
	}

	if err := usecase.budgetRepository.UpdateBudgetById(apiContract.BudgetRequest{Balance: budget.Balance - expense.Total}, expense.BudgetId); err != nil {
		return err
	}

	wallet, err := usecase.walletRepository.GetWalletById(expense.WalletId)
	if err != nil {
		return err
	}

	if wallet.Balance < expense.Total {
		return errors.New("wallet's balance insufficient")
	}

	if err := usecase.walletRepository.UpdateWalletById(apiContract.WalletRequest{Balance: wallet.Balance - expense.Total}, expense.WalletId); err != nil {
		return err
	}

	return usecase.repository.UpdateExpenseById(&apiContract.Expense{Total: expense.Total}, expense.Id)
}

func (usecase Usecase) UpdateExpenseById(expenseRequest apiContract.ExpenseRequest, id int64) error {
	existingExpense, err := usecase.repository.GetExpenseById(id)
	if err != nil {
		return err
	}

	budget, err := usecase.budgetRepository.GetBudgetById(existingExpense.BudgetId)
	if err != nil {
		return err
	}

	if err := usecase.budgetRepository.UpdateBudgetById(apiContract.BudgetRequest{Balance: budget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
		return err
	}

	wallet, err := usecase.walletRepository.GetWalletById(existingExpense.WalletId)
	if err != nil {
		return err
	}

	if err := usecase.walletRepository.UpdateWalletById(apiContract.WalletRequest{Balance: wallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
		return err
	}

	expense := apiContract.Expense{
		CreatedAt: time.Now(),
		Total:     0,
		WalletId:  expenseRequest.WalletId,
		BudgetId:  expenseRequest.BudgetId,
	}

	if err := usecase.repository.DeleteExpenseItems(id); err != nil {
		return err
	}

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

		if err := usecase.repository.CreateExpenseItem(&expenseItem); err != nil {
			return err
		}
	}

	budget, err = usecase.budgetRepository.GetBudgetById(expense.BudgetId)
	if err != nil {
		return err
	}

	if budget.Balance < expense.Total {
		return errors.New("budget's balance insufficient")
	}

	if err := usecase.budgetRepository.UpdateBudgetById(apiContract.BudgetRequest{Balance: budget.Balance - expense.Total}, expense.BudgetId); err != nil {
		return err
	}

	wallet, err = usecase.walletRepository.GetWalletById(expense.WalletId)
	if err != nil {
		return err
	}

	if wallet.Balance < expense.Total {
		return errors.New("wallet's balance insufficient")
	}

	if err := usecase.walletRepository.UpdateWalletById(apiContract.WalletRequest{Balance: wallet.Balance - expense.Total}, expense.WalletId); err != nil {
		return err
	}

	return usecase.repository.UpdateExpenseById(&expense, id)
}

func (usecase Usecase) DeleteExpenseById(id int64) error {
	existingExpense, err := usecase.repository.GetExpenseById(id)
	if err != nil {
		return err
	}

	budget, err := usecase.budgetRepository.GetBudgetById(existingExpense.BudgetId)
	if err != nil {
		return err
	}

	if err := usecase.budgetRepository.UpdateBudgetById(apiContract.BudgetRequest{Balance: budget.Balance + existingExpense.Total}, existingExpense.BudgetId); err != nil {
		return err
	}

	wallet, err := usecase.walletRepository.GetWalletById(existingExpense.WalletId)
	if err != nil {
		return err
	}

	if err := usecase.walletRepository.UpdateWalletById(apiContract.WalletRequest{Balance: wallet.Balance + existingExpense.Total}, existingExpense.WalletId); err != nil {
		return err
	}

	return usecase.repository.DeleteExpenseById(id)
}
