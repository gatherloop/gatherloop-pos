package mysql

import "apps/api/domain"

func ToMaterialDB(domainMaterial domain.Material) Material {
	return Material{
		Id:               domainMaterial.Id,
		Name:             domainMaterial.Name,
		Price:            domainMaterial.Price,
		Unit:             domainMaterial.Unit,
		Description:      domainMaterial.Description,
		PurchaseUnit:     domainMaterial.PurchaseUnit,
		PurchaseUnitSize: domainMaterial.PurchaseUnitSize,
		MinimumStock:     domainMaterial.MinimumStock,
		NormalStock:      domainMaterial.NormalStock,
		DeletedAt:        domainMaterial.DeletedAt,
		CreatedAt:        domainMaterial.CreatedAt,
	}
}

func ToMaterialDomain(dbMaterial Material) domain.Material {
	var suppliers []domain.MaterialSupplier
	for _, s := range dbMaterial.Suppliers {
		suppliers = append(suppliers, ToMaterialSupplierDomain(s))
	}
	return domain.Material{
		Id:               dbMaterial.Id,
		Name:             dbMaterial.Name,
		Price:            dbMaterial.Price,
		Unit:             dbMaterial.Unit,
		Description:      dbMaterial.Description,
		PurchaseUnit:     dbMaterial.PurchaseUnit,
		PurchaseUnitSize: dbMaterial.PurchaseUnitSize,
		MinimumStock:     dbMaterial.MinimumStock,
		NormalStock:      dbMaterial.NormalStock,
		Suppliers:        suppliers,
		DeletedAt:        dbMaterial.DeletedAt,
		CreatedAt:        dbMaterial.CreatedAt,
	}
}

func ToMaterialListDomain(dbMaterials []Material) []domain.Material {
	var domainMaterials []domain.Material
	for _, dbMaterial := range dbMaterials {
		domainMaterials = append(domainMaterials, ToMaterialDomain(dbMaterial))
	}
	return domainMaterials
}

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
