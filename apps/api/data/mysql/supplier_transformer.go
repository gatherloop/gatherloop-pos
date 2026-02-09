package mysql

import "apps/api/domain"

func ToSupplierDB(domainSupplier domain.Supplier) Supplier {
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

func ToSupplierDomain(dbSupplier Supplier) domain.Supplier {
	return domain.Supplier{
		Id:        dbSupplier.Id,
		Name:      dbSupplier.Name,
		Phone:     dbSupplier.Phone,
		Address:   dbSupplier.Address,
		MapsLink:  dbSupplier.MapsLink,
		DeletedAt: dbSupplier.DeletedAt,
		CreatedAt: dbSupplier.CreatedAt,
	}
}

func ToSupplierListDomain(dbSuppliers []Supplier) []domain.Supplier {
	var domainSuppliers []domain.Supplier
	for _, dbSupplier := range dbSuppliers {
		domainSuppliers = append(domainSuppliers, ToSupplierDomain(dbSupplier))
	}
	return domainSuppliers
}
