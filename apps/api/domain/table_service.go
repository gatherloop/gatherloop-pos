package domain

import "context"

const maxTableCodeGenerationAttempts = 5

type TableService struct {
	tableRepository TableRepository
}

func NewTableService(tableRepository TableRepository) TableService {
	return TableService{tableRepository: tableRepository}
}

func (service TableService) GenerateUniqueCode(ctx context.Context) (string, *Error) {
	for attempt := 0; attempt < maxTableCodeGenerationAttempts; attempt++ {
		code, err := GenerateTableCode()
		if err != nil {
			return "", &Error{Type: InternalServerError, Message: "failed to generate table code"}
		}

		if existing, existingErr := service.tableRepository.GetTableByCode(ctx, code); existingErr == nil && existing.Id > 0 {
			continue
		}

		return code, nil
	}

	return "", &Error{Type: InternalServerError, Message: "failed to generate a unique table code"}
}
