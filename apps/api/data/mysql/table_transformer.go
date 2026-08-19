package mysql

import "apps/api/domain"

func ToTableDB(domainTable domain.Table) Table {
	return Table{
		Id:          domainTable.Id,
		Code:        domainTable.Code,
		Label:       domainTable.Label,
		FloorNumber: domainTable.FloorNumber,
		CreatedAt:   domainTable.CreatedAt,
		DeletedAt:   domainTable.DeletedAt,
	}
}

func ToTableDomain(dbTable Table) domain.Table {
	return domain.Table{
		Id:          dbTable.Id,
		Code:        dbTable.Code,
		Label:       dbTable.Label,
		FloorNumber: dbTable.FloorNumber,
		CreatedAt:   dbTable.CreatedAt,
		DeletedAt:   dbTable.DeletedAt,
	}
}

func ToTableListDomain(dbTables []Table) []domain.Table {
	var domainTables []domain.Table
	for _, dbTable := range dbTables {
		domainTables = append(domainTables, ToTableDomain(dbTable))
	}
	return domainTables
}
