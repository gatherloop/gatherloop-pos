package domain

import "context"

type ChecklistTemplateUsecase struct {
	repository ChecklistTemplateRepository
}

func NewChecklistTemplateUsecase(repository ChecklistTemplateRepository) ChecklistTemplateUsecase {
	return ChecklistTemplateUsecase{repository: repository}
}

func (usecase ChecklistTemplateUsecase) GetChecklistTemplateList(ctx context.Context, query string, skip int, limit int) ([]ChecklistTemplate, int64, *Error) {
	templates, err := usecase.repository.GetChecklistTemplateList(ctx, query, skip, limit)
	if err != nil {
		return []ChecklistTemplate{}, 0, err
	}

	total, err := usecase.repository.GetChecklistTemplateListTotal(ctx, query)
	if err != nil {
		return []ChecklistTemplate{}, 0, err
	}

	return templates, total, nil
}

func (usecase ChecklistTemplateUsecase) GetChecklistTemplateById(ctx context.Context, id int64) (ChecklistTemplate, *Error) {
	return usecase.repository.GetChecklistTemplateById(ctx, id)
}

func (usecase ChecklistTemplateUsecase) CreateChecklistTemplate(ctx context.Context, template ChecklistTemplate) (ChecklistTemplate, *Error) {
	if template.Name == "" {
		return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "name is required"}
	}

	if len(template.Items) == 0 {
		return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "at least one item is required"}
	}

	for _, item := range template.Items {
		if item.Name == "" {
			return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "item name is required"}
		}
		for _, subItem := range item.SubItems {
			if subItem.Name == "" {
				return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "sub-item name is required"}
			}
		}
	}

	var created ChecklistTemplate
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, existingErr := usecase.repository.GetChecklistTemplateByName(ctxWithTx, template.Name)
		if existingErr == nil && existing.Id > 0 {
			return &Error{Type: BadRequest, Message: "template name already exists"}
		}

		result, createErr := usecase.repository.CreateChecklistTemplate(ctxWithTx, template)
		if createErr != nil {
			return createErr
		}
		created = result
		return nil
	})

	return created, err
}

func (usecase ChecklistTemplateUsecase) UpdateChecklistTemplateById(ctx context.Context, template ChecklistTemplate, id int64) (ChecklistTemplate, *Error) {
	if template.Name == "" {
		return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "name is required"}
	}

	if len(template.Items) == 0 {
		return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "at least one item is required"}
	}

	for _, item := range template.Items {
		if item.Name == "" {
			return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "item name is required"}
		}
		for _, subItem := range item.SubItems {
			if subItem.Name == "" {
				return ChecklistTemplate{}, &Error{Type: BadRequest, Message: "sub-item name is required"}
			}
		}
	}

	var updated ChecklistTemplate
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, existingErr := usecase.repository.GetChecklistTemplateByName(ctxWithTx, template.Name)
		if existingErr == nil && existing.Id > 0 && existing.Id != id {
			return &Error{Type: BadRequest, Message: "template name already exists"}
		}

		result, updateErr := usecase.repository.UpdateChecklistTemplateById(ctxWithTx, template, id)
		if updateErr != nil {
			return updateErr
		}
		updated = result
		return nil
	})

	return updated, err
}

func (usecase ChecklistTemplateUsecase) DeleteChecklistTemplateById(ctx context.Context, id int64) *Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		_, err := usecase.repository.GetChecklistTemplateById(ctxWithTx, id)
		if err != nil {
			return err
		}
		return usecase.repository.DeleteChecklistTemplateById(ctxWithTx, id)
	})
}
