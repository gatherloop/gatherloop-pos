package mysql

import "apps/api/domain"

func ToAvailabilityMovementDB(domainMovement domain.AvailabilityMovement) AvailabilityMovement {
	return AvailabilityMovement{
		Id:                domainMovement.Id,
		ProductId:         domainMovement.ProductId,
		VariantId:         domainMovement.VariantId,
		Delta:             domainMovement.Delta,
		ResultingQuantity: domainMovement.ResultingQuantity,
		Reason:            string(domainMovement.Reason),
		TransactionId:     domainMovement.TransactionId,
		Note:              domainMovement.Note,
		CreatedAt:         domainMovement.CreatedAt,
	}
}

func ToAvailabilityMovementDomain(dbMovement AvailabilityMovement) domain.AvailabilityMovement {
	return domain.AvailabilityMovement{
		Id:                dbMovement.Id,
		ProductId:         dbMovement.ProductId,
		VariantId:         dbMovement.VariantId,
		Delta:             dbMovement.Delta,
		ResultingQuantity: dbMovement.ResultingQuantity,
		Reason:            domain.AvailabilityMovementReason(dbMovement.Reason),
		TransactionId:     dbMovement.TransactionId,
		Note:              dbMovement.Note,
		CreatedAt:         dbMovement.CreatedAt,
	}
}

func ToAvailabilityMovementListDomain(dbMovements []AvailabilityMovement) []domain.AvailabilityMovement {
	domainMovements := make([]domain.AvailabilityMovement, 0, len(dbMovements))
	for _, dbMovement := range dbMovements {
		domainMovements = append(domainMovements, ToAvailabilityMovementDomain(dbMovement))
	}
	return domainMovements
}
