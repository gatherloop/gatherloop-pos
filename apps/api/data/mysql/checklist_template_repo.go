package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewChecklistTemplateRepository(db *gorm.DB) domain.ChecklistTemplateRepository {
	return Repository{db: db}
}

func (repo Repository) GetChecklistTemplateList(ctx context.Context, query string, skip int, limit int) ([]domain.ChecklistTemplate, *domain.Error) {
	var templates []ChecklistTemplate
	result := repo.db.Table("checklist_templates").
		Where("deleted_at IS NULL").
		Order("created_at ASC").
		Preload("Items", "deleted_at IS NULL", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Items.SubItems", "deleted_at IS NULL", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		})

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&templates)
	return ToChecklistTemplatesListDomain(templates), ToErrorCtx(ctx, result.Error, "GetChecklistTemplateList")
}

func (repo Repository) GetChecklistTemplateListTotal(ctx context.Context, query string) (int64, *domain.Error) {
	var count int64
	result := repo.db.Table("checklist_templates").Where("deleted_at IS NULL")

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)
	return count, ToErrorCtx(ctx, result.Error, "GetChecklistTemplateListTotal")
}

func (repo Repository) GetChecklistTemplateById(ctx context.Context, id int64) (domain.ChecklistTemplate, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var template ChecklistTemplate
	result := db.Table("checklist_templates").
		Where("id = ? AND deleted_at IS NULL", id).
		Preload("Items", "deleted_at IS NULL", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Items.SubItems", "deleted_at IS NULL", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		First(&template)
	return ToChecklistTemplateDomain(template), ToErrorCtx(ctx, result.Error, "GetChecklistTemplateById")
}

func (repo Repository) GetChecklistTemplateByName(ctx context.Context, name string) (domain.ChecklistTemplate, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var template ChecklistTemplate
	result := db.Table("checklist_templates").
		Where("name = ? AND deleted_at IS NULL", name).
		First(&template)
	return ToChecklistTemplateDomain(template), ToErrorCtx(ctx, result.Error, "GetChecklistTemplateByName")
}

func (repo Repository) CreateChecklistTemplate(ctx context.Context, template domain.ChecklistTemplate) (domain.ChecklistTemplate, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToChecklistTemplateDB(template)

	if result := db.Table("checklist_templates").Omit("Items").Create(&payload); result.Error != nil {
		return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "CreateChecklistTemplate")
	}

	for i := range template.Items {
		template.Items[i].ChecklistTemplateId = payload.Id
		itemPayload := ToChecklistTemplateItemDB(template.Items[i])
		if result := db.Table("checklist_template_items").Omit("SubItems").Create(&itemPayload); result.Error != nil {
			return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "CreateChecklistTemplate-item")
		}

		for j := range template.Items[i].SubItems {
			template.Items[i].SubItems[j].ChecklistTemplateItemId = itemPayload.Id
			subItemPayload := ToChecklistTemplateSubItemDB(template.Items[i].SubItems[j])
			if result := db.Table("checklist_template_sub_items").Create(&subItemPayload); result.Error != nil {
				return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "CreateChecklistTemplate-sub-item")
			}
		}
	}

	return repo.GetChecklistTemplateById(ctx, payload.Id)
}

func (repo Repository) UpdateChecklistTemplateById(ctx context.Context, template domain.ChecklistTemplate, id int64) (domain.ChecklistTemplate, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	// Update the template header
	if result := db.Table("checklist_templates").Where("id = ?", id).Updates(map[string]interface{}{
		"name":        template.Name,
		"description": template.Description,
	}); result.Error != nil {
		return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById")
	}

	// Collect incoming item IDs that already exist
	incomingItemIds := []int64{}
	for _, item := range template.Items {
		if item.Id > 0 {
			incomingItemIds = append(incomingItemIds, item.Id)
		}
	}

	// Soft-delete items not in the incoming list
	if len(incomingItemIds) > 0 {
		if result := db.Table("checklist_template_items").
			Where("checklist_template_id = ? AND id NOT IN ? AND deleted_at IS NULL", id, incomingItemIds).
			Update("deleted_at", time.Now()); result.Error != nil {
			return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-delete-items")
		}
	} else {
		if result := db.Table("checklist_template_items").
			Where("checklist_template_id = ? AND deleted_at IS NULL", id).
			Update("deleted_at", time.Now()); result.Error != nil {
			return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-delete-all-items")
		}
	}

	// Upsert items
	for _, item := range template.Items {
		item.ChecklistTemplateId = id

		if item.Id > 0 {
			// Update existing item
			if result := db.Table("checklist_template_items").Where("id = ?", item.Id).Updates(map[string]interface{}{
				"name":         item.Name,
				"description":  item.Description,
				"display_order": item.DisplayOrder,
				"deleted_at":   nil,
			}); result.Error != nil {
				return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-update-item")
			}
		} else {
			// Insert new item
			itemPayload := ToChecklistTemplateItemDB(item)
			if result := db.Table("checklist_template_items").Omit("SubItems").Create(&itemPayload); result.Error != nil {
				return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-create-item")
			}
			item.Id = itemPayload.Id
		}

		// Collect incoming sub-item IDs
		incomingSubItemIds := []int64{}
		for _, subItem := range item.SubItems {
			if subItem.Id > 0 {
				incomingSubItemIds = append(incomingSubItemIds, subItem.Id)
			}
		}

		// Soft-delete sub-items not in incoming list
		if len(incomingSubItemIds) > 0 {
			if result := db.Table("checklist_template_sub_items").
				Where("checklist_template_item_id = ? AND id NOT IN ? AND deleted_at IS NULL", item.Id, incomingSubItemIds).
				Update("deleted_at", time.Now()); result.Error != nil {
				return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-delete-sub-items")
			}
		} else {
			if result := db.Table("checklist_template_sub_items").
				Where("checklist_template_item_id = ? AND deleted_at IS NULL", item.Id).
				Update("deleted_at", time.Now()); result.Error != nil {
				return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-delete-all-sub-items")
			}
		}

		// Upsert sub-items
		for _, subItem := range item.SubItems {
			subItem.ChecklistTemplateItemId = item.Id

			if subItem.Id > 0 {
				if result := db.Table("checklist_template_sub_items").Where("id = ?", subItem.Id).Updates(map[string]interface{}{
					"name":         subItem.Name,
					"display_order": subItem.DisplayOrder,
					"deleted_at":   nil,
				}); result.Error != nil {
					return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-update-sub-item")
				}
			} else {
				subItemPayload := ToChecklistTemplateSubItemDB(subItem)
				if result := db.Table("checklist_template_sub_items").Create(&subItemPayload); result.Error != nil {
					return domain.ChecklistTemplate{}, ToErrorCtx(ctx, result.Error, "UpdateChecklistTemplateById-create-sub-item")
				}
			}
		}
	}

	return repo.GetChecklistTemplateById(ctx, id)
}

func (repo Repository) DeleteChecklistTemplateById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).
		Table("checklist_templates").
		Where("id = ?", id).
		Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteChecklistTemplateById")
}
