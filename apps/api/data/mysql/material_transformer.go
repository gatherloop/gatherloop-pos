package mysql

import "apps/api/domain/material"

func ToMaterialDB(domainMaterial material.Material) Material {
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

func ToMaterialDomain(dbMaterial Material) material.Material {
	return material.Material{
		Id:          dbMaterial.Id,
		Name:        dbMaterial.Name,
		Price:       dbMaterial.Price,
		Unit:        dbMaterial.Unit,
		Description: dbMaterial.Description,
		DeletedAt:   dbMaterial.DeletedAt,
		CreatedAt:   dbMaterial.CreatedAt,
	}
}

func ToMaterialListDomain(dbMaterials []Material) []material.Material {
	var domainMaterials []material.Material
	for _, dbMaterial := range dbMaterials {
		domainMaterials = append(domainMaterials, ToMaterialDomain(dbMaterial))
	}
	return domainMaterials
}
