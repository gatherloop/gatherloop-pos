//go:generate mockgen -source=checklist_session_repository.go -destination=../data/mock/checklist_session_repository.go -package=mock

package domain

import (
	"context"
	"time"
)

type ChecklistSessionRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetChecklistSessionById(ctx context.Context, id int64) (ChecklistSession, *Error)
	GetChecklistSessionByTemplateAndDate(ctx context.Context, templateId int64, date string) (ChecklistSession, *Error)
	CreateChecklistSession(ctx context.Context, session ChecklistSession) (ChecklistSession, *Error)
	DeleteChecklistSessionById(ctx context.Context, id int64) *Error
	GetChecklistSessionItemById(ctx context.Context, id int64) (ChecklistSessionItem, *Error)
	UpdateChecklistSessionItemCompletedAt(ctx context.Context, itemId int64, completedAt *time.Time) *Error
	UpdateChecklistSessionCompletedAt(ctx context.Context, sessionId int64, completedAt *time.Time) *Error
	GetChecklistSessionSubItemById(ctx context.Context, id int64) (ChecklistSessionSubItem, *Error)
	UpdateChecklistSessionSubItemCompletedAt(ctx context.Context, subItemId int64, completedAt *time.Time) *Error
	GetChecklistSessionItemsBySessionId(ctx context.Context, sessionId int64) ([]ChecklistSessionItem, *Error)
	GetChecklistSessionSubItemsByItemId(ctx context.Context, itemId int64) ([]ChecklistSessionSubItem, *Error)
}
