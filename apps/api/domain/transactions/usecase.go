package transactions

import (
	"apps/api/domain/base"
	"apps/api/domain/budgets"
	"apps/api/domain/products"
	"apps/api/domain/wallets"
	"context"
	"errors"
	"time"
)

type Usecase struct {
	repository        Repository
	productRepository products.Repository
	walletRepository  wallets.Repository
	budgetRepository  budgets.Repository
}

func NewUsecase(repository Repository, productRepository products.Repository, walletRepository wallets.Repository, budgetRepository budgets.Repository) Usecase {
	return Usecase{
		repository:        repository,
		productRepository: productRepository,
		walletRepository:  walletRepository,
		budgetRepository:  budgetRepository,
	}
}

func (usecase Usecase) GetTransactionList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, paymentStatus PaymentStatus) ([]Transaction, int64, error) {
	transactions, err := usecase.repository.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus)
	if err != nil {
		return []Transaction{}, 0, err
	}

	total, err := usecase.repository.GetTransactionListTotal(ctx, query, paymentStatus)
	if err != nil {
		return []Transaction{}, 0, err
	}

	return transactions, total, nil
}

func (usecase Usecase) GetTransactionById(ctx context.Context, id int64) (Transaction, error) {
	return usecase.repository.GetTransactionById(ctx, id)
}

func (usecase Usecase) CreateTransaction(ctx context.Context, transactionRequest TransactionRequest) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		transaction := Transaction{
			CreatedAt: time.Now(),
			Name:      transactionRequest.Name,
			Total:     0,
		}

		err := usecase.repository.CreateTransaction(ctxWithTx, &transaction)
		if err != nil {
			return err
		}

		var transactionItems []TransactionItem

		for _, item := range transactionRequest.TransactionItems {
			product, err := usecase.productRepository.GetProductById(ctxWithTx, item.ProductId)
			if err != nil {
				return err
			}

			subTotal := product.Price * item.Amount
			transaction.Total += subTotal

			transactionItem := TransactionItem{
				TransactionId: transaction.Id,
				ProductId:     item.ProductId,
				Amount:        item.Amount,
				Subtotal:      subTotal,
				Price:         product.Price,
			}

			transactionItems = append(transactionItems, transactionItem)
		}

		if err := usecase.repository.CreateTransactionItems(ctxWithTx, transactionItems); err != nil {
			return err
		}

		return usecase.repository.UpdateTransactionById(ctxWithTx, &Transaction{Total: transaction.Total}, transaction.Id)
	})

}

func (usecase Usecase) UpdateTransactionById(ctx context.Context, transactionRequest TransactionRequest, id int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		existingTransaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if existingTransaction.PaidAt != nil {
			return errors.New("cannot update paid transaction")
		}

		transaction := Transaction{
			Name:  transactionRequest.Name,
			Total: 0,
		}

		if err := usecase.repository.DeleteTransactionItems(ctxWithTx, id); err != nil {
			return err
		}

		var transactionItems []TransactionItem

		for _, item := range transactionRequest.TransactionItems {
			product, err := usecase.productRepository.GetProductById(ctxWithTx, item.ProductId)
			if err != nil {
				return err
			}

			subTotal := product.Price * item.Amount
			transaction.Total += subTotal

			transactionItem := TransactionItem{
				TransactionId: id,
				ProductId:     item.ProductId,
				Amount:        item.Amount,
				Subtotal:      subTotal,
				Price:         product.Price,
			}

			transactionItems = append(transactionItems, transactionItem)
		}

		if err := usecase.repository.CreateTransactionItems(ctxWithTx, transactionItems); err != nil {
			return err
		}

		return usecase.repository.UpdateTransactionById(ctxWithTx, &transaction, id)
	})
}

func (usecase Usecase) DeleteTransactionById(ctx context.Context, id int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		transaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt != nil {
			return errors.New("transaction already paid")
		}

		return usecase.repository.DeleteTranscationById(ctxWithTx, id)
	})
}

func (usecase Usecase) PayTransaction(ctx context.Context, transactionPayRequest TransactionPayRequest, id int64) error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) error {
		transaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt != nil {
			return errors.New("transaction already paid")
		}

		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, transactionPayRequest.WalletId)
		if err != nil {
			return err
		}

		paymentCost := transaction.Total * wallet.PaymentCostPercentage / 100
		newBalance := wallet.Balance + transaction.Total - paymentCost

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, wallets.WalletRequest{Balance: newBalance}, transactionPayRequest.WalletId); err != nil {
			return err
		}

		productMaterials := []products.ProductMaterial{}

		for _, item := range transaction.TransactionItems {
			productMaterials = append(productMaterials, item.Product.Materials...)
		}

		var foodCost float32
		for _, productMaterial := range productMaterials {
			foodCost += productMaterial.Amount * productMaterial.Material.Price
		}

		totalIncome := transaction.Total - paymentCost - foodCost

		if err := usecase.repository.UpdateTransactionById(ctxWithTx, &Transaction{TotalIncome: totalIncome}, id); err != nil {
			return err
		}

		budgetList, err := usecase.budgetRepository.GetBudgetList(ctxWithTx)
		if err != nil {
			return err
		}

		for _, budget := range budgetList {
			var restockBudgetId int64 = 4

			var newBalance float32

			if budget.Id == restockBudgetId {
				newBalance = budget.Balance + foodCost
			} else {
				addition := totalIncome * budget.Percentage / 100
				newBalance = budget.Balance + addition
			}

			if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, budgets.BudgetRequest{Balance: newBalance}, budget.Id); err != nil {
				return err
			}
		}
		return usecase.repository.PayTransaction(ctxWithTx, transactionPayRequest.WalletId, time.Now(), id)
	})
}

func (usecase Usecase) GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, error) {
	return usecase.repository.GetTransactionStatistics(ctx, groupBy)
}
