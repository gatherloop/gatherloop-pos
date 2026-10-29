package domain

import (
	"apps/api/utils"
	"context"
)

type MaterialService struct {
	supplierRepository SupplierRepository
}

func NewMaterialService(supplierRepository SupplierRepository) MaterialService {
	return MaterialService{supplierRepository: supplierRepository}
}

func (service MaterialService) ValidateSuppliers(ctx context.Context, suppliers []MaterialSupplier) *Error {
	for _, p := range suppliers {
		switch p.PurchaseType {
		case PurchaseTypeOnline:
			if !utils.IsValidHttpUrl(p.PurchaseUrl) {
				return &Error{Type: BadRequest, Message: "purchase_url must be a valid http(s):// URL for online purchase type"}
			}
		case PurchaseTypeOffline, PurchaseTypeDelivery:
			if p.PurchaseUrl != "" {
				return &Error{Type: BadRequest, Message: "purchase_url must be empty for offline and delivery purchase types"}
			}
		default:
			return &Error{Type: BadRequest, Message: "invalid purchase_type: must be online, offline, or delivery"}
		}

		_, err := service.supplierRepository.GetSupplierById(ctx, p.SupplierId)
		if err != nil {
			return &Error{Type: BadRequest, Message: "supplier not found or has been deleted"}
		}
	}
	return nil
}
