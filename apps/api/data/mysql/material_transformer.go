package mysql

import "apps/api/domain"

func ToMaterialDB(domainMaterial domain.Material) Material {
	return Material{
		Id:          domainMaterial.Id,
		Name:        domainMaterial.Name,
		Price:       domainMaterial.Price,
		Unit:        domainMaterial.Unit,
		Description: domainMaterial.Description,
		DeletedAt:   domainMaterial.DeletedAt,
		CreatedAt:   domainMaterial.CreatedAt,
	}
}

func ToMaterialDomain(dbMaterial Material) domain.Material {
	return domain.Material{
		Id:          dbMaterial.Id,
		Name:        dbMaterial.Name,
		Price:       dbMaterial.Price,
		Unit:        dbMaterial.Unit,
		Description: dbMaterial.Description,
		DeletedAt:   dbMaterial.DeletedAt,
		CreatedAt:   dbMaterial.CreatedAt,
	}
}

func ToMaterialListDomain(dbMaterials []Material) []domain.Material {
	var domainMaterials []domain.Material
	for _, dbMaterial := range dbMaterials {
		domainMaterials = append(domainMaterials, ToMaterialDomain(dbMaterial))
	}
	return domainMaterials
}
