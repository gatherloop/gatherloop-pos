package domain

import "time"

type ChecklistTemplateSubItem struct {
	Id                      int64
	ChecklistTemplateItemId int64
	Name                    string
	DisplayOrder            int64
	CreatedAt               time.Time
	UpdatedAt               time.Time
	DeletedAt               *time.Time
}

type ChecklistTemplateItem struct {
	Id                  int64
	ChecklistTemplateId int64
	Name                string
	Description         *string
	DisplayOrder        int64
	SubItems            []ChecklistTemplateSubItem
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}

type ChecklistTemplate struct {
	Id          int64
	Name        string
	Description *string
	Items       []ChecklistTemplateItem
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
}
