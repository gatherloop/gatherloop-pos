package wallets

import (
	"errors"
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetWalletList() ([]apiContract.Wallet, error) {
	return usecase.repository.GetWalletList()
}

func (usecase Usecase) GetWalletById(id int64) (apiContract.Wallet, error) {
	return usecase.repository.GetWalletById(id)
}

func (usecase Usecase) CreateWallet(walletRequest apiContract.WalletRequest) error {
	return usecase.repository.CreateWallet(walletRequest)
}

func (usecase Usecase) UpdateWalletById(walletRequest apiContract.WalletRequest, id int64) error {
	return usecase.repository.UpdateWalletById(walletRequest, id)
}

func (usecase Usecase) DeleteWalletById(id int64) error {
	return usecase.repository.DeleteWalletById(id)
}

func (usecase Usecase) GetWalletTransferList(walletId int64) ([]apiContract.WalletTransfer, error) {
	return usecase.repository.GetWalletTransferList(walletId)
}

func (usecase Usecase) CreateWalletTransfer(walletTransferRequest apiContract.WalletTransferRequest, fromWalletId int64) error {
	fromWallet, err := usecase.repository.GetWalletById(fromWalletId)
	if err != nil {
		return err
	}

	if walletTransferRequest.Amount > fromWallet.Balance {
		return errors.New("insufficient balance")
	}

	if err := usecase.repository.UpdateWalletById(apiContract.WalletRequest{Balance: fromWallet.Balance - walletTransferRequest.Amount}, fromWalletId); err != nil {
		return err
	}

	toWallet, err := usecase.repository.GetWalletById(walletTransferRequest.ToWalletId)
	if err != nil {
		return err
	}

	if err := usecase.repository.UpdateWalletById(apiContract.WalletRequest{Balance: toWallet.Balance + walletTransferRequest.Amount}, walletTransferRequest.ToWalletId); err != nil {
		return err
	}

	return usecase.repository.CreateWalletTransfer(walletTransferRequest, fromWalletId)
}
