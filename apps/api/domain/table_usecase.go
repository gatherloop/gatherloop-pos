package domain

import (
	"context"
	"strings"
)

type TableUsecase struct {
	tableRepository TableRepository
	tableService    TableService
}

func NewTableUsecase(
	tableRepository TableRepository,
	tableService TableService,
) TableUsecase {
	return TableUsecase{
		tableRepository: tableRepository,
		tableService:    tableService,
	}
}

func (usecase TableUsecase) GetTableList(ctx context.Context) ([]Table, *Error) {
	return usecase.tableRepository.GetTableList(ctx)
}

func (usecase TableUsecase) GetTableById(ctx context.Context, id int64) (Table, *Error) {
	return usecase.tableRepository.GetTableById(ctx, id)
}

func (usecase TableUsecase) GetTableByCode(ctx context.Context, code string) (Table, *Error) {
	return usecase.tableRepository.GetTableByCode(ctx, code)
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
	err := usecase.tableRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if existing, existingErr := usecase.tableRepository.GetTableByLabel(ctxWithTx, table.Label); existingErr == nil && existing.Id > 0 {
			return &Error{Type: BadRequest, Message: "table label already exists"}
		}

		code, genErr := usecase.tableService.GenerateUniqueCode(ctxWithTx)
		if genErr != nil {
			return genErr
		}
		table.Code = code

		result, createErr := usecase.tableRepository.CreateTable(ctxWithTx, table)
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
	err := usecase.tableRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if existing, existingErr := usecase.tableRepository.GetTableByLabel(ctxWithTx, table.Label); existingErr == nil && existing.Id > 0 && existing.Id != id {
			return &Error{Type: BadRequest, Message: "table label already exists"}
		}

		current, currentErr := usecase.tableRepository.GetTableById(ctxWithTx, id)
		if currentErr != nil {
			return currentErr
		}
		table.Code = current.Code

		result, updateErr := usecase.tableRepository.UpdateTableById(ctxWithTx, table, id)
		if updateErr != nil {
			return updateErr
		}
		updated = result
		return nil
	})

	return updated, err
}

func (usecase TableUsecase) DeleteTableById(ctx context.Context, id int64) *Error {
	return usecase.tableRepository.DeleteTableById(ctx, id)
}

func (usecase TableUsecase) RegenerateTableCode(ctx context.Context, id int64) (Table, *Error) {
	var regenerated Table
	err := usecase.tableRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existing, existingErr := usecase.tableRepository.GetTableById(ctxWithTx, id)
		if existingErr != nil {
			return existingErr
		}

		code, genErr := usecase.tableService.GenerateUniqueCode(ctxWithTx)
		if genErr != nil {
			return genErr
		}
		existing.Code = code

		result, updateErr := usecase.tableRepository.UpdateTableById(ctxWithTx, existing, id)
		if updateErr != nil {
			return updateErr
		}
		regenerated = result
		return nil
	})

	return regenerated, err
}
