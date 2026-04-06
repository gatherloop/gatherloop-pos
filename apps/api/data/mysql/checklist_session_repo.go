package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewChecklistSessionRepository(db *gorm.DB) domain.ChecklistSessionRepository {
	return Repository{db: db}
}

func (repo Repository) GetChecklistSessionById(ctx context.Context, id int64) (domain.ChecklistSession, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var session ChecklistSession
	result := db.Table("checklist_sessions").
		Where("id = ? AND deleted_at IS NULL", id).
		Preload("ChecklistTemplate").
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Items.SubItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		First(&session)
	return ToChecklistSessionDomain(session), ToErrorCtx(ctx, result.Error, "GetChecklistSessionById")
}

func (repo Repository) GetChecklistSessionByTemplateAndDate(ctx context.Context, templateId int64, date string) (domain.ChecklistSession, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var session ChecklistSession
	result := db.Table("checklist_sessions").
		Where("checklist_template_id = ? AND date = ? AND deleted_at IS NULL", templateId, date).
		First(&session)
	return ToChecklistSessionDomain(session), ToErrorCtx(ctx, result.Error, "GetChecklistSessionByTemplateAndDate")
}

func (repo Repository) CreateChecklistSession(ctx context.Context, session domain.ChecklistSession) (domain.ChecklistSession, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToChecklistSessionDB(session)

	if result := db.Table("checklist_sessions").Omit("Items", "ChecklistTemplate").Create(&payload); result.Error != nil {
		return domain.ChecklistSession{}, ToErrorCtx(ctx, result.Error, "CreateChecklistSession")
	}

	for i := range session.Items {
		session.Items[i].ChecklistSessionId = payload.Id
		itemPayload := ToChecklistSessionItemDB(session.Items[i])
		if result := db.Table("checklist_session_items").Omit("SubItems").Create(&itemPayload); result.Error != nil {
			return domain.ChecklistSession{}, ToErrorCtx(ctx, result.Error, "CreateChecklistSession-item")
		}

		for j := range session.Items[i].SubItems {
			session.Items[i].SubItems[j].ChecklistSessionItemId = itemPayload.Id
			subItemPayload := ToChecklistSessionSubItemDB(session.Items[i].SubItems[j])
			if result := db.Table("checklist_session_sub_items").Create(&subItemPayload); result.Error != nil {
				return domain.ChecklistSession{}, ToErrorCtx(ctx, result.Error, "CreateChecklistSession-sub-item")
			}
		}
	}

	return repo.GetChecklistSessionById(ctx, payload.Id)
}

func (repo Repository) DeleteChecklistSessionById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Clauses(clause.OnConflict{UpdateAll: true}).
		Table("checklist_sessions").
		Where("id = ?", id).
		Update("deleted_at", time.Now())
	return ToErrorCtx(ctx, result.Error, "DeleteChecklistSessionById")
}

func (repo Repository) GetChecklistSessionItemById(ctx context.Context, id int64) (domain.ChecklistSessionItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var item ChecklistSessionItem
	result := db.Table("checklist_session_items").
		Where("id = ?", id).
		Preload("SubItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		First(&item)
	return ToChecklistSessionItemDomain(item), ToErrorCtx(ctx, result.Error, "GetChecklistSessionItemById")
}

func (repo Repository) UpdateChecklistSessionItemCompletedAt(ctx context.Context, itemId int64, completedAt *time.Time) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("checklist_session_items").
		Where("id = ?", itemId).
		Update("completed_at", completedAt)
	return ToErrorCtx(ctx, result.Error, "UpdateChecklistSessionItemCompletedAt")
}

func (repo Repository) UpdateChecklistSessionCompletedAt(ctx context.Context, sessionId int64, completedAt *time.Time) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("checklist_sessions").
		Where("id = ?", sessionId).
		Update("completed_at", completedAt)
	return ToErrorCtx(ctx, result.Error, "UpdateChecklistSessionCompletedAt")
}

func (repo Repository) GetChecklistSessionSubItemById(ctx context.Context, id int64) (domain.ChecklistSessionSubItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var subItem ChecklistSessionSubItem
	result := db.Table("checklist_session_sub_items").
		Where("id = ?", id).
		First(&subItem)
	return ToChecklistSessionSubItemDomain(subItem), ToErrorCtx(ctx, result.Error, "GetChecklistSessionSubItemById")
}

func (repo Repository) UpdateChecklistSessionSubItemCompletedAt(ctx context.Context, subItemId int64, completedAt *time.Time) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("checklist_session_sub_items").
		Where("id = ?", subItemId).
		Update("completed_at", completedAt)
	return ToErrorCtx(ctx, result.Error, "UpdateChecklistSessionSubItemCompletedAt")
}

func (repo Repository) GetChecklistSessionItemsBySessionId(ctx context.Context, sessionId int64) ([]domain.ChecklistSessionItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var items []ChecklistSessionItem
	result := db.Table("checklist_session_items").
		Where("checklist_session_id = ?", sessionId).
		Order("display_order ASC").
		Find(&items)
	return ToChecklistSessionItemsListDomain(items), ToErrorCtx(ctx, result.Error, "GetChecklistSessionItemsBySessionId")
}

func (repo Repository) GetChecklistSessionSubItemsByItemId(ctx context.Context, itemId int64) ([]domain.ChecklistSessionSubItem, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var subItems []ChecklistSessionSubItem
	result := db.Table("checklist_session_sub_items").
		Where("checklist_session_item_id = ?", itemId).
		Order("display_order ASC").
		Find(&subItems)
	return ToChecklistSessionSubItemsListDomain(subItems), ToErrorCtx(ctx, result.Error, "GetChecklistSessionSubItemsByItemId")
}

func (repo Repository) GetChecklistSessionList(ctx context.Context, filter domain.ChecklistSessionFilter, skip int, limit int) ([]domain.ChecklistSession, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var sessions []ChecklistSession
	query := db.Table("checklist_sessions").
		Where("checklist_sessions.deleted_at IS NULL").
		Preload("ChecklistTemplate").
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Items.SubItems", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Order("checklist_sessions.date DESC").
		Offset(skip).
		Limit(limit)

	if filter.TemplateId != nil {
		query = query.Where("checklist_sessions.checklist_template_id = ?", *filter.TemplateId)
	}
	if filter.DateFrom != nil {
		query = query.Where("checklist_sessions.date >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("checklist_sessions.date <= ?", *filter.DateTo)
	}
	if filter.Status != nil {
		if *filter.Status == "completed" {
			query = query.Where("checklist_sessions.completed_at IS NOT NULL")
		} else if *filter.Status == "incomplete" {
			query = query.Where("checklist_sessions.completed_at IS NULL")
		}
	}

	result := query.Find(&sessions)
	domainSessions := []domain.ChecklistSession{}
	for _, s := range sessions {
		domainSessions = append(domainSessions, ToChecklistSessionDomain(s))
	}
	return domainSessions, ToErrorCtx(ctx, result.Error, "GetChecklistSessionList")
}

func (repo Repository) GetChecklistSessionListTotal(ctx context.Context, filter domain.ChecklistSessionFilter) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var total int64
	query := db.Table("checklist_sessions").
		Where("deleted_at IS NULL")

	if filter.TemplateId != nil {
		query = query.Where("checklist_template_id = ?", *filter.TemplateId)
	}
	if filter.DateFrom != nil {
		query = query.Where("date >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("date <= ?", *filter.DateTo)
	}
	if filter.Status != nil {
		if *filter.Status == "completed" {
			query = query.Where("completed_at IS NOT NULL")
		} else if *filter.Status == "incomplete" {
			query = query.Where("completed_at IS NULL")
		}
	}

	result := query.Count(&total)
	return total, ToErrorCtx(ctx, result.Error, "GetChecklistSessionListTotal")
}
