package mysql

import "apps/api/domain"

func ToWalletDB(domainWallet domain.Wallet) Wallet {
	return Wallet{
		Id:                    domainWallet.Id,
		Name:                  domainWallet.Name,
		Balance:               domainWallet.Balance,
		PaymentCostPercentage: domainWallet.PaymentCostPercentage,
		IsCashless:            domainWallet.IsCashless,
		CreatedAt:             domainWallet.CreatedAt,
		DeletedAt:             domainWallet.DeletedAt,
	}
}

func ToWalletDomain(dbWallet Wallet) domain.Wallet {
	return domain.Wallet{
		Id:                    dbWallet.Id,
		Name:                  dbWallet.Name,
		Balance:               dbWallet.Balance,
		PaymentCostPercentage: dbWallet.PaymentCostPercentage,
		IsCashless:            dbWallet.IsCashless,
		CreatedAt:             dbWallet.CreatedAt,
		DeletedAt:             dbWallet.DeletedAt,
	}
}

func ToWalletListDomain(dbWallets []Wallet) []domain.Wallet {
	var domainWallets []domain.Wallet
	for _, dbWallet := range dbWallets {
		domainWallets = append(domainWallets, ToWalletDomain(dbWallet))
	}
	return domainWallets
}

func ToWalletTransferDB(domainTransfer domain.WalletTransfer) WalletTransfer {
	return WalletTransfer{
		Id:           domainTransfer.Id,
		CreatedAt:    domainTransfer.CreatedAt,
		Amount:       domainTransfer.Amount,
		FromWalletId: domainTransfer.FromWalletId,
		FromWallet:   ToWalletDB(domainTransfer.FromWallet),
		ToWalletId:   domainTransfer.ToWalletId,
		ToWallet:     ToWalletDB(domainTransfer.ToWallet),
		DeletedAt:    domainTransfer.DeletedAt,
	}
}

func ToWalletTransferDomain(dbTransfer WalletTransfer) domain.WalletTransfer {
	return domain.WalletTransfer{
		Id:           dbTransfer.Id,
		CreatedAt:    dbTransfer.CreatedAt,
		Amount:       dbTransfer.Amount,
		FromWalletId: dbTransfer.FromWalletId,
		FromWallet:   ToWalletDomain(dbTransfer.FromWallet),
		ToWalletId:   dbTransfer.ToWalletId,
		ToWallet:     ToWalletDomain(dbTransfer.ToWallet),
		DeletedAt:    dbTransfer.DeletedAt,
	}
}

func ToWalletTransferListDomain(dbTransfers []WalletTransfer) []domain.WalletTransfer {
	var domainTransfers []domain.WalletTransfer
	for _, dbTransfer := range dbTransfers {
		domainTransfers = append(domainTransfers, ToWalletTransferDomain(dbTransfer))
	}
	return domainTransfers
}
