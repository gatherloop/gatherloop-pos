package transactions

import (
	"apps/api/modules/products"
	"apps/api/modules/wallets"
	"errors"
	apiContract "libs/api-contract"
	"time"
)

type Usecase struct {
	repository        Repository
	productRepository products.Repository
	walletRepository  wallets.Repository
}

func NewUsecase(repository Repository, productRepository products.Repository, walletRepository wallets.Repository) Usecase {
	return Usecase{
		repository:        repository,
		productRepository: productRepository,
		walletRepository:  walletRepository,
	}
}

func (usecase Usecase) GetTransactionList() ([]apiContract.Transaction, error) {
	return usecase.repository.GetTransactionList()
}

func (usecase Usecase) GetTransactionById(id int64) (apiContract.Transaction, error) {
	return usecase.repository.GetTransactionById(id)
}

func (usecase Usecase) CreateTransaction(transactionRequest apiContract.TransactionRequest) error {
	transaction := apiContract.Transaction{
		CreatedAt: time.Now(),
		Name:      transactionRequest.Name,
		Total:     0,
	}

	err := usecase.repository.CreateTransaction(&transaction)
	if err != nil {
		return err
	}

	for _, item := range transactionRequest.TransactionItems {
		product, err := usecase.productRepository.GetProductById(item.ProductId)
		if err != nil {
			return err
		}

		subTotal := product.Price * item.Amount
		transaction.Total += subTotal

		transactionItem := apiContract.TransactionItem{
			TransactionId: transaction.Id,
			ProductId:     item.ProductId,
			Amount:        item.Amount,
			Subtotal:      subTotal,
			Price:         product.Price,
		}

		if err := usecase.repository.CreateTransactionItem(&transactionItem); err != nil {
			return err
		}
	}

	return usecase.repository.UpdateTransactionById(&apiContract.Transaction{Total: transaction.Total}, transaction.Id)
}

func (usecase Usecase) UpdateTransactionById(transactionRequest apiContract.TransactionRequest, id int64) error {
	existingTransaction, err := usecase.repository.GetTransactionById(id)
	if err != nil {
		return err
	}

	if existingTransaction.PaidAt != nil {
		return errors.New("cannot update paid transaction")
	}

	transaction := apiContract.Transaction{
		Name:  transactionRequest.Name,
		Total: 0,
	}

	if err := usecase.repository.DeleteTransactionItems(id); err != nil {
		return err
	}

	for _, item := range transactionRequest.TransactionItems {
		product, err := usecase.productRepository.GetProductById(item.ProductId)
		if err != nil {
			return err
		}

		subTotal := product.Price * item.Amount
		transaction.Total += subTotal

		transactionItem := apiContract.TransactionItem{
			TransactionId: id,
			ProductId:     item.ProductId,
			Amount:        item.Amount,
			Subtotal:      subTotal,
			Price:         product.Price,
		}

		if err := usecase.repository.CreateTransactionItem(&transactionItem); err != nil {
			return err
		}
	}

	return usecase.repository.UpdateTransactionById(&transaction, id)
}

func (usecase Usecase) DeleteTransactionById(id int64) error {
	transaction, err := usecase.repository.GetTransactionById(id)
	if err != nil {
		return err
	}

	if transaction.PaidAt != nil {
		return errors.New("transaction already paid")
	}

	return usecase.repository.DeleteTranscationById(id)
}

func (usecase Usecase) PayTransaction(transactionPayRequest apiContract.TransactionPayRequest, id int64) error {
	transaction, err := usecase.repository.GetTransactionById(id)
	if err != nil {
		return err
	}

	if transaction.PaidAt != nil {
		return errors.New("transaction already paid")
	}

	wallet, err := usecase.walletRepository.GetWalletById(transactionPayRequest.WalletId)
	if err != nil {
		return err
	}

	if err := usecase.walletRepository.UpdateWalletById(apiContract.WalletRequest{Balance: wallet.Balance + transaction.Total}, transactionPayRequest.WalletId); err != nil {
		return err
	}

	return usecase.repository.PayTransaction(transactionPayRequest.WalletId, time.Now(), id)
}
