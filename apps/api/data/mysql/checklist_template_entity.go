package mysql

import "time"

type ChecklistTemplateSubItem struct {
	Id                      int64
	ChecklistTemplateItemId int64
	Name                    string
	DisplayOrder            int
	CreatedAt               time.Time
	UpdatedAt               time.Time
	DeletedAt               *time.Time
}

type ChecklistTemplateItem struct {
	Id                  int64
	ChecklistTemplateId int64
	Name                string
	Description         *string
	DisplayOrder        int
	SubItems            []ChecklistTemplateSubItem `gorm:"foreignKey:ChecklistTemplateItemId"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}

type ChecklistTemplate struct {
	Id          int64
	Name        string
	Description *string
	Items       []ChecklistTemplateItem `gorm:"foreignKey:ChecklistTemplateId"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
}
