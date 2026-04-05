package mysql

import "apps/api/domain"

func ToChecklistSessionSubItemDomain(db ChecklistSessionSubItem) domain.ChecklistSessionSubItem {
	return domain.ChecklistSessionSubItem{
		Id:                         db.Id,
		ChecklistSessionItemId:     db.ChecklistSessionItemId,
		ChecklistTemplateSubItemId: db.ChecklistTemplateSubItemId,
		Name:                       db.Name,
		DisplayOrder:               db.DisplayOrder,
		CompletedAt:                db.CompletedAt,
		CreatedAt:                  db.CreatedAt,
		UpdatedAt:                  db.UpdatedAt,
	}
}

func ToChecklistSessionSubItemDB(d domain.ChecklistSessionSubItem) ChecklistSessionSubItem {
	return ChecklistSessionSubItem{
		Id:                         d.Id,
		ChecklistSessionItemId:     d.ChecklistSessionItemId,
		ChecklistTemplateSubItemId: d.ChecklistTemplateSubItemId,
		Name:                       d.Name,
		DisplayOrder:               d.DisplayOrder,
		CompletedAt:                d.CompletedAt,
		CreatedAt:                  d.CreatedAt,
		UpdatedAt:                  d.UpdatedAt,
	}
}

func ToChecklistSessionSubItemsListDomain(dbs []ChecklistSessionSubItem) []domain.ChecklistSessionSubItem {
	var result []domain.ChecklistSessionSubItem
	for _, db := range dbs {
		result = append(result, ToChecklistSessionSubItemDomain(db))
	}
	return result
}

func ToChecklistSessionSubItemsListDB(ds []domain.ChecklistSessionSubItem) []ChecklistSessionSubItem {
	var result []ChecklistSessionSubItem
	for _, d := range ds {
		result = append(result, ToChecklistSessionSubItemDB(d))
	}
	return result
}

func ToChecklistSessionItemDomain(db ChecklistSessionItem) domain.ChecklistSessionItem {
	return domain.ChecklistSessionItem{
		Id:                      db.Id,
		ChecklistSessionId:      db.ChecklistSessionId,
		ChecklistTemplateItemId: db.ChecklistTemplateItemId,
		Name:                    db.Name,
		Description:             db.Description,
		DisplayOrder:            db.DisplayOrder,
		CompletedAt:             db.CompletedAt,
		SubItems:                ToChecklistSessionSubItemsListDomain(db.SubItems),
		CreatedAt:               db.CreatedAt,
		UpdatedAt:               db.UpdatedAt,
	}
}

func ToChecklistSessionItemDB(d domain.ChecklistSessionItem) ChecklistSessionItem {
	return ChecklistSessionItem{
		Id:                      d.Id,
		ChecklistSessionId:      d.ChecklistSessionId,
		ChecklistTemplateItemId: d.ChecklistTemplateItemId,
		Name:                    d.Name,
		Description:             d.Description,
		DisplayOrder:            d.DisplayOrder,
		CompletedAt:             d.CompletedAt,
		SubItems:                ToChecklistSessionSubItemsListDB(d.SubItems),
		CreatedAt:               d.CreatedAt,
		UpdatedAt:               d.UpdatedAt,
	}
}

func ToChecklistSessionItemsListDomain(dbs []ChecklistSessionItem) []domain.ChecklistSessionItem {
	var result []domain.ChecklistSessionItem
	for _, db := range dbs {
		result = append(result, ToChecklistSessionItemDomain(db))
	}
	return result
}

func ToChecklistSessionDomain(db ChecklistSession) domain.ChecklistSession {
	var template *domain.ChecklistTemplate
	if db.ChecklistTemplate != nil {
		t := ToChecklistTemplateDomain(*db.ChecklistTemplate)
		template = &t
	}
	return domain.ChecklistSession{
		Id:                  db.Id,
		ChecklistTemplateId: db.ChecklistTemplateId,
		ChecklistTemplate:   template,
		Date:                db.Date,
		CompletedAt:         db.CompletedAt,
		Items:               ToChecklistSessionItemsListDomain(db.Items),
		CreatedAt:           db.CreatedAt,
		UpdatedAt:           db.UpdatedAt,
		DeletedAt:           db.DeletedAt,
	}
}

func ToChecklistSessionDB(d domain.ChecklistSession) ChecklistSession {
	return ChecklistSession{
		Id:                  d.Id,
		ChecklistTemplateId: d.ChecklistTemplateId,
		Date:                d.Date,
		CompletedAt:         d.CompletedAt,
		Items:               ToChecklistSessionItemsListDB(d.Items),
		CreatedAt:           d.CreatedAt,
		UpdatedAt:           d.UpdatedAt,
		DeletedAt:           d.DeletedAt,
	}
}

func ToChecklistSessionItemsListDB(ds []domain.ChecklistSessionItem) []ChecklistSessionItem {
	var result []ChecklistSessionItem
	for _, d := range ds {
		result = append(result, ToChecklistSessionItemDB(d))
	}
	return result
}
