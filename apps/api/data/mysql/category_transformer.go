package mysql

import "apps/api/domain"

func ToCategoryDB(domainCategory domain.Category) Category {
	return Category{
		Id:        domainCategory.Id,
		Name:      domainCategory.Name,
		CreatedAt: domainCategory.CreatedAt,
		DeletedAt: domainCategory.DeletedAt,
	}
}

func ToCategoryDomain(dbCategory Category) domain.Category {
	return domain.Category{
		Id:        dbCategory.Id,
		Name:      dbCategory.Name,
		CreatedAt: dbCategory.CreatedAt,
		DeletedAt: dbCategory.DeletedAt,
	}
}

func ToCategoryListDomain(dbCategories []Category) []domain.Category {
	var domainCategories []domain.Category
	for _, dbCategory := range dbCategories {
		domainCategories = append(domainCategories, ToCategoryDomain(dbCategory))
	}
	return domainCategories
}
