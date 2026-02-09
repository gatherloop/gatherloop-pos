package mysql

import "apps/api/domain"

func ToRentalDB(domainRental domain.Rental) Rental {
	return Rental{
		Id:        domainRental.Id,
		Name:      domainRental.Name,
		CreatedAt: domainRental.CreatedAt,
		DeletedAt: domainRental.DeletedAt,
	}
}

func ToRentalDomain(dbRental Rental) domain.Rental {
	return domain.Rental{
		Id:        dbRental.Id,
		Name:      dbRental.Name,
		CreatedAt: dbRental.CreatedAt,
		DeletedAt: dbRental.DeletedAt,
	}
}

func ToRentalListDomain(dbRentals []Rental) []domain.Rental {
	var domainRentals []domain.Rental
	for _, dbRental := range dbRentals {
		domainRentals = append(domainRentals, ToRentalDomain(dbRental))
	}
	return domainRentals
}

func ToRentalListDB(domainRentals []domain.Rental) []Rental {
	var dbRentals []Rental
	for _, domainRental := range domainRentals {
		dbRentals = append(dbRentals, ToRentalDB(domainRental))
	}
	return dbRentals
}
