package mysql

import "apps/api/domain"

func ToMaterialSupplierDomain(db MaterialSupplier) domain.MaterialSupplier {
	return domain.MaterialSupplier{
		Id:           db.Id,
		MaterialId:   db.MaterialId,
		SupplierId:   db.SupplierId,
		Supplier:     ToSupplierDomain(db.Supplier),
		PurchaseType: domain.PurchaseType(db.PurchaseType),
		PurchaseUrl:  db.PurchaseUrl,
		DeletedAt:    db.DeletedAt,
		CreatedAt:    db.CreatedAt,
	}
}

func ToMaterialSupplierDB(d domain.MaterialSupplier) MaterialSupplier {
	return MaterialSupplier{
		Id:           d.Id,
		MaterialId:   d.MaterialId,
		SupplierId:   d.SupplierId,
		Supplier:     ToSupplierDB(d.Supplier),
		PurchaseType: string(d.PurchaseType),
		PurchaseUrl:  d.PurchaseUrl,
		DeletedAt:    d.DeletedAt,
		CreatedAt:    d.CreatedAt,
	}
}

func ToMaterialSupplierListDomain(dbs []MaterialSupplier) []domain.MaterialSupplier {
	var result []domain.MaterialSupplier
	for _, db := range dbs {
		result = append(result, ToMaterialSupplierDomain(db))
	}
	return result
}

func ToMaterialSupplierListDB(ds []domain.MaterialSupplier) []MaterialSupplier {
	var result []MaterialSupplier
	for _, d := range ds {
		result = append(result, ToMaterialSupplierDB(d))
	}
	return result
}
