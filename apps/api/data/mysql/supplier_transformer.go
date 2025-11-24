package mysql

import "apps/api/domain/supplier"

func ToSupplierDB(domainSupplier supplier.Supplier) Supplier {
	return Supplier{
		Id:        domainSupplier.Id,
		Name:      domainSupplier.Name,
		Phone:     domainSupplier.Phone,
		Address:   domainSupplier.Address,
		MapsLink:  domainSupplier.MapsLink,
		DeletedAt: domainSupplier.DeletedAt,
		CreatedAt: domainSupplier.CreatedAt,
	}
}

func ToSupplierDomain(dbSupplier Supplier) supplier.Supplier {
	return supplier.Supplier{
		Id:        dbSupplier.Id,
		Name:      dbSupplier.Name,
		Phone:     dbSupplier.Phone,
		Address:   dbSupplier.Address,
		MapsLink:  dbSupplier.MapsLink,
		DeletedAt: dbSupplier.DeletedAt,
		CreatedAt: dbSupplier.CreatedAt,
	}
}

func ToSupplierListDomain(dbSuppliers []Supplier) []supplier.Supplier {
	var domainSuppliers []supplier.Supplier
	for _, dbSupplier := range dbSuppliers {
		domainSuppliers = append(domainSuppliers, ToSupplierDomain(dbSupplier))
	}
	return domainSuppliers
}
