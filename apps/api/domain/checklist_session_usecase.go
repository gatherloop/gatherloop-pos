package domain

import (
	"context"
	"time"
)

type ChecklistSessionUsecase struct {
	repository         ChecklistSessionRepository
	templateRepository ChecklistTemplateRepository
}

func NewChecklistSessionUsecase(repository ChecklistSessionRepository, templateRepository ChecklistTemplateRepository) ChecklistSessionUsecase {
	return ChecklistSessionUsecase{repository: repository, templateRepository: templateRepository}
}

func (usecase ChecklistSessionUsecase) GetChecklistSessionById(ctx context.Context, id int64) (ChecklistSession, *Error) {
	return usecase.repository.GetChecklistSessionById(ctx, id)
}

func (usecase ChecklistSessionUsecase) CreateChecklistSession(ctx context.Context, session ChecklistSession) (ChecklistSession, *Error) {
	if session.ChecklistTemplateId == 0 {
		return ChecklistSession{}, &Error{Type: BadRequest, Message: "checklist template id is required"}
	}

	if session.Date == "" {
		return ChecklistSession{}, &Error{Type: BadRequest, Message: "date is required"}
	}

	var created ChecklistSession
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		template, templateErr := usecase.templateRepository.GetChecklistTemplateById(ctxWithTx, session.ChecklistTemplateId)
		if templateErr != nil {
			return templateErr
		}

		existing, existingErr := usecase.repository.GetChecklistSessionByTemplateAndDate(ctxWithTx, session.ChecklistTemplateId, session.Date)
		if existingErr == nil && existing.Id > 0 {
			return &Error{Type: BadRequest, Message: "a session for this template and date already exists"}
		}

		// Build snapshot of session items from template items
		sessionItems := []ChecklistSessionItem{}
		for _, templateItem := range template.Items {
			templateItemId := templateItem.Id
			sessionItem := ChecklistSessionItem{
				ChecklistTemplateItemId: &templateItemId,
				Name:                    templateItem.Name,
				Description:             templateItem.Description,
				DisplayOrder:            templateItem.DisplayOrder,
				SubItems:                []ChecklistSessionSubItem{},
			}

			for _, templateSubItem := range templateItem.SubItems {
				templateSubItemId := templateSubItem.Id
				sessionItem.SubItems = append(sessionItem.SubItems, ChecklistSessionSubItem{
					ChecklistTemplateSubItemId: &templateSubItemId,
					Name:                       templateSubItem.Name,
					DisplayOrder:               templateSubItem.DisplayOrder,
				})
			}

			sessionItems = append(sessionItems, sessionItem)
		}

		session.Items = sessionItems

		result, createErr := usecase.repository.CreateChecklistSession(ctxWithTx, session)
		if createErr != nil {
			return createErr
		}
		created = result
		return nil
	})

	return created, err
}

func (usecase ChecklistSessionUsecase) DeleteChecklistSessionById(ctx context.Context, id int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		_, err := usecase.repository.GetChecklistSessionById(ctxWithTx, id)
		if err != nil {
			return err
		}
		return usecase.repository.DeleteChecklistSessionById(ctxWithTx, id)
	})
}

func (usecase ChecklistSessionUsecase) CheckSessionItem(ctx context.Context, itemId int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		item, err := usecase.repository.GetChecklistSessionItemById(ctxWithTx, itemId)
		if err != nil {
			return err
		}

		if len(item.SubItems) > 0 {
			return &Error{Type: BadRequest, Message: "item has sub-items, check individual sub-items instead"}
		}

		now := time.Now()
		if err := usecase.repository.UpdateChecklistSessionItemCompletedAt(ctxWithTx, itemId, &now); err != nil {
			return err
		}

		return usecase.autoCompleteSessionIfNeeded(ctxWithTx, item.ChecklistSessionId)
	})
}

func (usecase ChecklistSessionUsecase) UncheckSessionItem(ctx context.Context, itemId int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		item, err := usecase.repository.GetChecklistSessionItemById(ctxWithTx, itemId)
		if err != nil {
			return err
		}

		if len(item.SubItems) > 0 {
			return &Error{Type: BadRequest, Message: "item has sub-items, uncheck individual sub-items instead"}
		}

		if err := usecase.repository.UpdateChecklistSessionItemCompletedAt(ctxWithTx, itemId, nil); err != nil {
			return err
		}

		return usecase.revertSessionCompletionIfNeeded(ctxWithTx, item.ChecklistSessionId)
	})
}

func (usecase ChecklistSessionUsecase) CheckSessionSubItem(ctx context.Context, subItemId int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		subItem, err := usecase.repository.GetChecklistSessionSubItemById(ctxWithTx, subItemId)
		if err != nil {
			return err
		}

		now := time.Now()
		if err := usecase.repository.UpdateChecklistSessionSubItemCompletedAt(ctxWithTx, subItemId, &now); err != nil {
			return err
		}

		// Check if all sub-items are now completed → auto-complete parent item
		subItems, err := usecase.repository.GetChecklistSessionSubItemsByItemId(ctxWithTx, subItem.ChecklistSessionItemId)
		if err != nil {
			return err
		}

		allSubItemsDone := allSubItemsCompleted(subItems)
		if allSubItemsDone {
			if err := usecase.repository.UpdateChecklistSessionItemCompletedAt(ctxWithTx, subItem.ChecklistSessionItemId, &now); err != nil {
				return err
			}

			parentItem, err := usecase.repository.GetChecklistSessionItemById(ctxWithTx, subItem.ChecklistSessionItemId)
			if err != nil {
				return err
			}

			return usecase.autoCompleteSessionIfNeeded(ctxWithTx, parentItem.ChecklistSessionId)
		}

		return nil
	})
}

func (usecase ChecklistSessionUsecase) UncheckSessionSubItem(ctx context.Context, subItemId int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		subItem, err := usecase.repository.GetChecklistSessionSubItemById(ctxWithTx, subItemId)
		if err != nil {
			return err
		}

		if err := usecase.repository.UpdateChecklistSessionSubItemCompletedAt(ctxWithTx, subItemId, nil); err != nil {
			return err
		}

		// Check parent item completion → revert if needed
		parentItem, err := usecase.repository.GetChecklistSessionItemById(ctxWithTx, subItem.ChecklistSessionItemId)
		if err != nil {
			return err
		}

		if parentItem.CompletedAt != nil {
			if err := usecase.repository.UpdateChecklistSessionItemCompletedAt(ctxWithTx, subItem.ChecklistSessionItemId, nil); err != nil {
				return err
			}
			return usecase.revertSessionCompletionIfNeeded(ctxWithTx, parentItem.ChecklistSessionId)
		}

		return nil
	})
}

// autoCompleteSessionIfNeeded checks if all items are completed and marks the session as completed.
func (usecase ChecklistSessionUsecase) autoCompleteSessionIfNeeded(ctx context.Context, sessionId int64) *Error {
	items, err := usecase.repository.GetChecklistSessionItemsBySessionId(ctx, sessionId)
	if err != nil {
		return err
	}

	if allItemsCompleted(items) {
		now := time.Now()
		return usecase.repository.UpdateChecklistSessionCompletedAt(ctx, sessionId, &now)
	}

	return nil
}

// revertSessionCompletionIfNeeded clears session completion if it was previously marked complete.
func (usecase ChecklistSessionUsecase) revertSessionCompletionIfNeeded(ctx context.Context, sessionId int64) *Error {
	session, err := usecase.repository.GetChecklistSessionById(ctx, sessionId)
	if err != nil {
		return err
	}

	if session.CompletedAt != nil {
		return usecase.repository.UpdateChecklistSessionCompletedAt(ctx, sessionId, nil)
	}

	return nil
}

func allItemsCompleted(items []ChecklistSessionItem) bool {
	if len(items) == 0 {
		return false
	}
	for _, item := range items {
		if item.CompletedAt == nil {
			return false
		}
	}
	return true
}

func allSubItemsCompleted(subItems []ChecklistSessionSubItem) bool {
	if len(subItems) == 0 {
		return false
	}
	for _, si := range subItems {
		if si.CompletedAt == nil {
			return false
		}
	}
	return true
}
