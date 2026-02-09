package mysql

import "apps/api/domain"

func ToProductDB(domainProduct domain.Product) Product {
	return Product{
		Id:          domainProduct.Id,
		CategoryId:  domainProduct.CategoryId,
		Name:        domainProduct.Name,
		Description: domainProduct.Description,
		ImageUrl:    domainProduct.ImageUrl,
		SaleType:    string(domainProduct.SaleType),
		DeletedAt:   domainProduct.DeletedAt,
		CreatedAt:   domainProduct.CreatedAt,
		Category:    ToCategoryDB(domainProduct.Category),
		Options:     ToOptionListDB(domainProduct.Options),
	}
}

func ToProductDomain(dbProduct Product) domain.Product {
	return domain.Product{
		Id:          dbProduct.Id,
		CategoryId:  dbProduct.CategoryId,
		Name:        dbProduct.Name,
		Description: dbProduct.Description,
		ImageUrl:    dbProduct.ImageUrl,
		SaleType:    domain.SaleType(dbProduct.SaleType),
		DeletedAt:   dbProduct.DeletedAt,
		CreatedAt:   dbProduct.CreatedAt,
		Category:    ToCategoryDomain(dbProduct.Category),
		Options:     ToOptionListDomain(dbProduct.Options),
	}
}

func ToProductListDomain(dbProducts []Product) []domain.Product {
	var domainProducts []domain.Product
	for _, dbProduct := range dbProducts {
		domainProducts = append(domainProducts, ToProductDomain(dbProduct))
	}
	return domainProducts
}

func ToOptionDomain(dbOption Option) domain.Option {
	var domainOptionValues []domain.OptionValue
	for _, dbOptionValue := range dbOption.Values {
		domainOptionValues = append(domainOptionValues, ToOptionValueDomain(dbOptionValue))
	}
	return domain.Option{
		Id:     dbOption.Id,
		Name:   dbOption.Name,
		Values: domainOptionValues,
	}
}

func ToOptionValueDomain(dbOptionValue OptionValue) domain.OptionValue {
	return domain.OptionValue{
		Id:   dbOptionValue.Id,
		Name: dbOptionValue.Name,
	}
}

func ToOptionListDomain(dbOptions []Option) []domain.Option {
	var domainOptions []domain.Option
	for _, dbOption := range dbOptions {
		domainOptions = append(domainOptions, ToOptionDomain(dbOption))
	}
	return domainOptions
}

func ToOptionDB(domainOption domain.Option) Option {
	var dbOptionValues []OptionValue
	for _, domainOptionValue := range domainOption.Values {
		dbOptionValues = append(dbOptionValues, ToOptionValueDB(domainOptionValue))
	}
	return Option{
		Id:        domainOption.Id,
		ProductId: domainOption.ProductId,
		Name:      domainOption.Name,
		Values:    dbOptionValues,
	}
}

func ToOptionValueDB(domainOptionValue domain.OptionValue) OptionValue {
	return OptionValue{
		Id:   domainOptionValue.Id,
		Name: domainOptionValue.Name,
	}
}

func ToOptionListDB(domainOptions []domain.Option) []Option {
	var dbOptions []Option
	for _, domainOption := range domainOptions {
		dbOptions = append(dbOptions, ToOptionDB(domainOption))
	}
	return dbOptions
}
