package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewWhatsappNumberVerificationRepository(db *gorm.DB) domain.WhatsappNumberVerificationRepository {
	return Repository{db: db}
}

func (repo Repository) IsWhatsappNumberVerified(ctx context.Context, whatsappNumber string) (bool, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("whatsapp_number_verifications").
		Where("whatsapp_number = ?", whatsappNumber).
		Count(&count)
	if result.Error != nil {
		return false, ToErrorCtx(ctx, result.Error, "IsWhatsappNumberVerified")
	}
	return count > 0, nil
}

// MarkWhatsappNumberVerified upserts on the unique key so concurrent checkouts confirming the
// same number race harmlessly (see the table design in
// docs/prd-order-whatsapp-number-validation.md).
func (repo Repository) MarkWhatsappNumberVerified(ctx context.Context, whatsappNumber string, verifiedAt time.Time) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	payload := WhatsappNumberVerification{WhatsappNumber: whatsappNumber, VerifiedAt: verifiedAt}

	result := db.Table("whatsapp_number_verifications").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "whatsapp_number"}},
			DoUpdates: clause.AssignmentColumns([]string{"verified_at"}),
		}).
		Create(&payload)
	return ToErrorCtx(ctx, result.Error, "MarkWhatsappNumberVerified")
}
