package mysql

import "time"

type ChecklistSessionSubItem struct {
	Id                         int64
	ChecklistSessionItemId     int64
	ChecklistTemplateSubItemId *int64
	Name                       string
	DisplayOrder               int
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
	DisplayOrder            int
	CompletedAt             *time.Time
	SubItems                []ChecklistSessionSubItem `gorm:"foreignKey:ChecklistSessionItemId"`
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type ChecklistSession struct {
	Id                  int64
	ChecklistTemplateId int64
	ChecklistTemplate   *ChecklistTemplate `gorm:"foreignKey:Id;references:ChecklistTemplateId"`
	Date                string
	CompletedAt         *time.Time
	Items               []ChecklistSessionItem `gorm:"foreignKey:ChecklistSessionId"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}
