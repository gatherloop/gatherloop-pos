package domain

import "time"

type ChecklistSessionSubItem struct {
	Id                         int64
	ChecklistSessionItemId     int64
	ChecklistTemplateSubItemId *int64
	Name                       string
	DisplayOrder               int64
	CompletedAt                *time.Time
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
}

type ChecklistSessionItem struct {
	Id                      int64
	ChecklistSessionId      int64
	ChecklistTemplateItemId *int64
	Name                    string
	Description             *string
	DisplayOrder            int64
	CompletedAt             *time.Time
	SubItems                []ChecklistSessionSubItem
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type ChecklistSession struct {
	Id                  int64
	ChecklistTemplateId int64
	ChecklistTemplate   *ChecklistTemplate
	Date                string
	CompletedAt         *time.Time
	Items               []ChecklistSessionItem
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}
