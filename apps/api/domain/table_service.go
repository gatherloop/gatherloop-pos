package domain

import "context"

const maxTableCodeGenerationAttempts = 5

type TableService struct {
	tableRepoPort TableRepoPort
}

func NewTableService(tableRepoPort TableRepoPort) TableService {
	return TableService{tableRepoPort: tableRepoPort}
}

func (service TableService) GenerateUniqueCode(ctx context.Context) (string, *Error) {
	for attempt := 0; attempt < maxTableCodeGenerationAttempts; attempt++ {
		code, err := GenerateTableCode()
		if err != nil {
			return "", &Error{Type: InternalServerError, Message: "failed to generate table code"}
		}

		if existing, existingErr := service.tableRepoPort.GetTableByCode(ctx, code); existingErr == nil && existing.Id > 0 {
			continue
		}

		return code, nil
	}

	return "", &Error{Type: InternalServerError, Message: "failed to generate a unique table code"}
}
