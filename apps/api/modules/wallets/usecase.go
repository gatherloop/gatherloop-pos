package wallets

import (
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
