package mysql

import "apps/api/domain"

func ToChecklistTemplateSubItemDomain(db ChecklistTemplateSubItem) domain.ChecklistTemplateSubItem {
	return domain.ChecklistTemplateSubItem{
		Id:                      db.Id,
		ChecklistTemplateItemId: db.ChecklistTemplateItemId,
		Name:                    db.Name,
		DisplayOrder:            db.DisplayOrder,
		CreatedAt:               db.CreatedAt,
		UpdatedAt:               db.UpdatedAt,
		DeletedAt:               db.DeletedAt,
	}
}

func ToChecklistTemplateSubItemDB(d domain.ChecklistTemplateSubItem) ChecklistTemplateSubItem {
	return ChecklistTemplateSubItem{
		Id:                      d.Id,
		ChecklistTemplateItemId: d.ChecklistTemplateItemId,
		Name:                    d.Name,
		DisplayOrder:            d.DisplayOrder,
		CreatedAt:               d.CreatedAt,
		UpdatedAt:               d.UpdatedAt,
		DeletedAt:               d.DeletedAt,
	}
}

func ToChecklistTemplateSubItemsListDomain(dbs []ChecklistTemplateSubItem) []domain.ChecklistTemplateSubItem {
	var result []domain.ChecklistTemplateSubItem
	for _, db := range dbs {
		result = append(result, ToChecklistTemplateSubItemDomain(db))
	}
	return result
}

func ToChecklistTemplateSubItemsListDB(ds []domain.ChecklistTemplateSubItem) []ChecklistTemplateSubItem {
	var result []ChecklistTemplateSubItem
	for _, d := range ds {
		result = append(result, ToChecklistTemplateSubItemDB(d))
	}
	return result
}

func ToChecklistTemplateItemDomain(db ChecklistTemplateItem) domain.ChecklistTemplateItem {
	return domain.ChecklistTemplateItem{
		Id:                  db.Id,
		ChecklistTemplateId: db.ChecklistTemplateId,
		Name:                db.Name,
		Description:         db.Description,
		DisplayOrder:        db.DisplayOrder,
		SubItems:            ToChecklistTemplateSubItemsListDomain(db.SubItems),
		CreatedAt:           db.CreatedAt,
		UpdatedAt:           db.UpdatedAt,
		DeletedAt:           db.DeletedAt,
	}
}

func ToChecklistTemplateItemDB(d domain.ChecklistTemplateItem) ChecklistTemplateItem {
	return ChecklistTemplateItem{
		Id:                  d.Id,
		ChecklistTemplateId: d.ChecklistTemplateId,
		Name:                d.Name,
		Description:         d.Description,
		DisplayOrder:        d.DisplayOrder,
		SubItems:            ToChecklistTemplateSubItemsListDB(d.SubItems),
		CreatedAt:           d.CreatedAt,
		UpdatedAt:           d.UpdatedAt,
		DeletedAt:           d.DeletedAt,
	}
}

func ToChecklistTemplateItemsListDomain(dbs []ChecklistTemplateItem) []domain.ChecklistTemplateItem {
	var result []domain.ChecklistTemplateItem
	for _, db := range dbs {
		result = append(result, ToChecklistTemplateItemDomain(db))
	}
	return result
}

func ToChecklistTemplateItemsListDB(ds []domain.ChecklistTemplateItem) []ChecklistTemplateItem {
	var result []ChecklistTemplateItem
	for _, d := range ds {
		result = append(result, ToChecklistTemplateItemDB(d))
	}
	return result
}

func ToChecklistTemplateDomain(db ChecklistTemplate) domain.ChecklistTemplate {
	return domain.ChecklistTemplate{
		Id:          db.Id,
		Name:        db.Name,
		Description: db.Description,
		Items:       ToChecklistTemplateItemsListDomain(db.Items),
		CreatedAt:   db.CreatedAt,
		UpdatedAt:   db.UpdatedAt,
		DeletedAt:   db.DeletedAt,
	}
}

func ToChecklistTemplateDB(d domain.ChecklistTemplate) ChecklistTemplate {
	return ChecklistTemplate{
		Id:          d.Id,
		Name:        d.Name,
		Description: d.Description,
		Items:       ToChecklistTemplateItemsListDB(d.Items),
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
		DeletedAt:   d.DeletedAt,
	}
}

func ToChecklistTemplatesListDomain(dbs []ChecklistTemplate) []domain.ChecklistTemplate {
	var result []domain.ChecklistTemplate
	for _, db := range dbs {
		result = append(result, ToChecklistTemplateDomain(db))
	}
	return result
}
