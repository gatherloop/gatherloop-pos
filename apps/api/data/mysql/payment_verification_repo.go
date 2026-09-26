package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewPaymentVerificationRepository(db *gorm.DB) domain.PaymentVerificationRepository {
	return Repository{db: db}
}

func (repo Repository) Create(ctx context.Context, photo domain.PaymentVerificationPhoto) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToPaymentVerificationPhotoDB(photo)
	result := db.Table("payment_verification_photos").Create(&payload)
	return ToErrorCtx(ctx, result.Error, "Create")
}

func (repo Repository) GetByPaymentId(ctx context.Context, paymentId int64) (domain.PaymentVerificationPhoto, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var photo PaymentVerificationPhoto
	result := db.Table("payment_verification_photos").
		Where("payment_id = ?", paymentId).
		First(&photo)
	return ToPaymentVerificationPhotoDomain(photo), ToErrorCtx(ctx, result.Error, "GetByPaymentId")
}

func (repo Repository) DeleteByPaymentId(ctx context.Context, paymentId int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("payment_verification_photos").
		Where("payment_id = ?", paymentId).
		Delete(&PaymentVerificationPhoto{})
	return ToErrorCtx(ctx, result.Error, "DeleteByPaymentId")
}

// DeleteOrphaned is the D5 backstop: it deletes photos whose payment is no longer cod + pending +
// awaiting (approved, cancelled, expired, or paid), bounded by limit per sweeper tick.
func (repo Repository) DeleteOrphaned(ctx context.Context, limit int) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	liveCodAwaitingPaymentIds := db.Table("payments").
		Select("id").
		Where("method = ? AND status = ? AND verification_status = ?",
			string(domain.PaymentMethodCod), string(domain.PaymentStatePending), string(domain.PaymentVerificationStatusAwaiting))

	query := db.Table("payment_verification_photos").Where("payment_id NOT IN (?)", liveCodAwaitingPaymentIds)
	if limit > 0 {
		query = query.Limit(limit)
	}

	result := query.Delete(&PaymentVerificationPhoto{})
	return result.RowsAffected, ToErrorCtx(ctx, result.Error, "DeleteOrphaned")
}
