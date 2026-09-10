package domain

import (
	"context"
	"strings"
)

const maxTableCodeGenerationAttempts = 5

type TableUsecase struct {
	repository TableRepository
}

func NewTableUsecase(repository TableRepository) TableUsecase {
	return TableUsecase{repository: repository}
}

func (usecase TableUsecase) GetTableList(ctx context.Context) ([]Table, *Error) {
	return usecase.repository.GetTableList(ctx)
}

func (usecase TableUsecase) GetTableById(ctx context.Context, id int64) (Table, *Error) {
	return usecase.repository.GetTableById(ctx, id)
}

func (usecase TableUsecase) GetTableByCode(ctx context.Context, code string) (Table, *Error) {
	return usecase.repository.GetTableByCode(ctx, code)
}

func (usecase TableUsecase) CreateTable(ctx context.Context, table Table) (Table, *Error) {
	table.Label = strings.TrimSpace(table.Label)
	if table.Label == "" {
		return Table{}, &Error{Type: BadRequest, Message: "label is required"}
	}
	if table.FloorNumber < 1 {
		return Table{}, &Error{Type: BadRequest, Message: "floor number must be at least 1"}
	}

	var created Table
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if existing, existingErr := usecase.repository.GetTableByLabel(ctxWithTx, table.Label); existingErr == nil && existing.Id > 0 {
			return &Error{Type: BadRequest, Message: "table label already exists"}
		}

		code, genErr := usecase.generateUniqueCode(ctxWithTx)
		if genErr != nil {
			return genErr
		}
		table.Code = code

		result, createErr := usecase.repository.CreateTable(ctxWithTx, table)
		if createErr != nil {
			return createErr
		}
		created = result
		return nil
	})

	return created, err
}

func (usecase TableUsecase) UpdateTableById(ctx context.Context, table Table, id int64) (Table, *Error) {
	table.Label = strings.TrimSpace(table.Label)
	if table.Label == "" {
		return Table{}, &Error{Type: BadRequest, Message: "label is required"}
	}
	if table.FloorNumber < 1 {
		return Table{}, &Error{Type: BadRequest, Message: "floor number must be at least 1"}
	}

	var updated Table
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if existing, existingErr := usecase.repository.GetTableByLabel(ctxWithTx, table.Label); existingErr == nil && existing.Id > 0 && existing.Id != id {
			return &Error{Type: BadRequest, Message: "table label already exists"}
		}

		current, currentErr := usecase.repository.GetTableById(ctxWithTx, id)
		if currentErr != nil {
			return currentErr
		}
		table.Code = current.Code

		result, updateErr := usecase.repository.UpdateTableById(ctxWithTx, table, id)
		if updateErr != nil {
			return updateErr
		}
		updated = result
		return nil
	})

	return updated, err
}

func (usecase TableUsecase) DeleteTableById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteTableById(ctx, id)
}

func (usecase TableUsecase) RegenerateTableCode(ctx context.Context, id int64) (Table, *Error) {
	var regenerated Table
	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, existingErr := usecase.repository.GetTableById(ctxWithTx, id)
		if existingErr != nil {
			return existingErr
		}

		code, genErr := usecase.generateUniqueCode(ctxWithTx)
		if genErr != nil {
			return genErr
		}
		existing.Code = code

		result, updateErr := usecase.repository.UpdateTableById(ctxWithTx, existing, id)
		if updateErr != nil {
			return updateErr
		}
		regenerated = result
		return nil
	})

	return regenerated, err
}

func (usecase TableUsecase) generateUniqueCode(ctx context.Context) (string, *Error) {
	for attempt := 0; attempt < maxTableCodeGenerationAttempts; attempt++ {
		code, err := GenerateTableCode()
		if err != nil {
			return "", &Error{Type: InternalServerError, Message: "failed to generate table code"}
		}

		if existing, existingErr := usecase.repository.GetTableByCode(ctx, code); existingErr == nil && existing.Id > 0 {
			continue
		}

		return code, nil
	}

	return "", &Error{Type: InternalServerError, Message: "failed to generate a unique table code"}
}
