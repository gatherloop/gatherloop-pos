//go:generate mockgen -source=checklist_template_repository.go -destination=../data/mock/checklist_template_repository.go -package=mock

package domain

import "context"

type ChecklistTemplateRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetChecklistTemplateList(ctx context.Context, query string, skip int, limit int) ([]ChecklistTemplate, *Error)
	GetChecklistTemplateListTotal(ctx context.Context, query string) (int64, *Error)
	GetChecklistTemplateById(ctx context.Context, id int64) (ChecklistTemplate, *Error)
	GetChecklistTemplateByName(ctx context.Context, name string) (ChecklistTemplate, *Error)
	CreateChecklistTemplate(ctx context.Context, template ChecklistTemplate) (ChecklistTemplate, *Error)
	UpdateChecklistTemplateById(ctx context.Context, template ChecklistTemplate, id int64) (ChecklistTemplate, *Error)
	DeleteChecklistTemplateById(ctx context.Context, id int64) *Error
}
