package mysql

import "apps/api/domain"

func ToVariantDB(domainVariant domain.Variant) Variant {
	return Variant{
		Id:            domainVariant.Id,
		ProductId:     domainVariant.ProductId,
		Name:          domainVariant.Name,
		Price:         domainVariant.Price,
		Description:   domainVariant.Description,
		DeletedAt:     domainVariant.DeletedAt,
		CreatedAt:     domainVariant.CreatedAt,
		Product:       ToProductDB(domainVariant.Product),
		Materials:     ToVariantMaterialListDB(domainVariant.Materials),
		VariantValues: ToVariantValueListDB(domainVariant.VariantValues),
	}
}

func ToVariantDomain(dbVariant Variant) domain.Variant {
	return domain.Variant{
		Id:            dbVariant.Id,
		ProductId:     dbVariant.ProductId,
		Name:          dbVariant.Name,
		Price:         dbVariant.Price,
		Description:   dbVariant.Description,
		DeletedAt:     dbVariant.DeletedAt,
		CreatedAt:     dbVariant.CreatedAt,
		Product:       ToProductDomain(dbVariant.Product),
		Materials:     ToVariantMaterialListDomain(dbVariant.Materials),
		VariantValues: ToVariantValueListDomain(dbVariant.VariantValues),
	}
}

func ToVariantsListDomain(dbVariants []Variant) []domain.Variant {
	var domainVariants []domain.Variant
	for _, dbVar := range dbVariants {
		domainVariants = append(domainVariants, ToVariantDomain(dbVar))
	}
	return domainVariants
}

func ToVariantMaterialDomain(dbVariantMaterial VariantMaterial) domain.VariantMaterial {
	return domain.VariantMaterial{
		Id:         dbVariantMaterial.Id,
		VariantId:  dbVariantMaterial.VariantId,
		MaterialId: dbVariantMaterial.MaterialId,
		Material:   ToMaterialDomain(dbVariantMaterial.Material),
		Amount:     dbVariantMaterial.Amount,
		DeletedAt:  dbVariantMaterial.DeletedAt,
		CreatedAt:  dbVariantMaterial.CreatedAt,
	}
}

func ToVariantMaterialDB(domainVariantMaterial domain.VariantMaterial) VariantMaterial {
	return VariantMaterial{
		Id:         domainVariantMaterial.Id,
		VariantId:  domainVariantMaterial.VariantId,
		MaterialId: domainVariantMaterial.MaterialId,
		Material:   ToMaterialDB(domainVariantMaterial.Material),
		Amount:     domainVariantMaterial.Amount,
		DeletedAt:  domainVariantMaterial.DeletedAt,
		CreatedAt:  domainVariantMaterial.CreatedAt,
	}
}

func ToVariantMaterialListDomain(dbVariantMaterials []VariantMaterial) []domain.VariantMaterial {
	var domainVariantMaterials []domain.VariantMaterial
	for _, dbVarMat := range dbVariantMaterials {
		domainVariantMaterials = append(domainVariantMaterials, ToVariantMaterialDomain(dbVarMat))
	}
	return domainVariantMaterials
}

func ToVariantMaterialListDB(domainVariantMaterials []domain.VariantMaterial) []VariantMaterial {
	var dbVariantMaterials []VariantMaterial
	for _, domainVarMat := range domainVariantMaterials {
		dbVariantMaterials = append(dbVariantMaterials, ToVariantMaterialDB(domainVarMat))
	}
	return dbVariantMaterials
}

func ToVariantValueDomain(dbVariantValue VariantValue) domain.VariantValue {
	return domain.VariantValue{
		Id:            dbVariantValue.Id,
		VariantId:     dbVariantValue.VariantId,
		OptionValueId: dbVariantValue.OptionValueId,
		OptionValue:   ToOptionValueDomain(dbVariantValue.OptionValue),
	}
}

func ToVariantValueDB(domainVariantValue domain.VariantValue) VariantValue {
	return VariantValue{
		Id:            domainVariantValue.Id,
		VariantId:     domainVariantValue.VariantId,
		OptionValueId: domainVariantValue.OptionValueId,
		OptionValue:   ToOptionValueDB(domainVariantValue.OptionValue),
	}
}

func ToVariantValueListDomain(dbVariantValues []VariantValue) []domain.VariantValue {
	var domainVariantValues []domain.VariantValue
	for _, dbVarVal := range dbVariantValues {
		domainVariantValues = append(domainVariantValues, ToVariantValueDomain(dbVarVal))
	}
	return domainVariantValues
}

func ToVariantValueListDB(domainVariantValues []domain.VariantValue) []VariantValue {
	var dbVariantValues []VariantValue
	for _, domainVarVal := range domainVariantValues {
		dbVariantValues = append(dbVariantValues, ToVariantValueDB(domainVarVal))
	}
	return dbVariantValues
}
