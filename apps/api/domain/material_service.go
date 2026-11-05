package domain

import (
	"apps/api/utils"
	"context"
)

type MaterialService struct {
	supplierRepoPort SupplierRepoPort
}

func NewMaterialService(supplierRepoPort SupplierRepoPort) MaterialService {
	return MaterialService{supplierRepoPort: supplierRepoPort}
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

		_, err := service.supplierRepoPort.GetSupplierById(ctx, p.SupplierId)
		if err != nil {
			return &Error{Type: BadRequest, Message: "supplier not found or has been deleted"}
		}
	}
	return nil
}
