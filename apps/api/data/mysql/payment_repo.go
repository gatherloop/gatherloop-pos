package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewPaymentRepository(db *gorm.DB) domain.PaymentRepository {
	return Repository{db: db}
}

func (repo Repository) GetPaymentById(ctx context.Context, id int64) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var payment Payment
	result := db.Table("payments").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&payment)
	return ToPaymentDomain(payment), ToErrorCtx(ctx, result.Error, "GetPaymentById")
}

func (repo Repository) GetPaymentByPartnerReferenceNo(ctx context.Context, partnerReferenceNo string) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var payment Payment
	result := db.Table("payments").
		Where("partner_reference_no = ? AND deleted_at IS NULL", partnerReferenceNo).
		First(&payment)
	return ToPaymentDomain(payment), ToErrorCtx(ctx, result.Error, "GetPaymentByPartnerReferenceNo")
}

func (repo Repository) GetPendingPaymentByCartId(ctx context.Context, cartId int64) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var payment Payment
	result := db.Table("payments").
		Where("cart_id = ? AND status = ? AND deleted_at IS NULL", cartId, string(domain.PaymentStatePending)).
		Order("id DESC").
		First(&payment)
	return ToPaymentDomain(payment), ToErrorCtx(ctx, result.Error, "GetPendingPaymentByCartId")
}

func (repo Repository) CreatePayment(ctx context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToPaymentDB(payment)

	if result := db.Table("payments").Create(&payload); result.Error != nil {
		return domain.Payment{}, ToErrorCtx(ctx, result.Error, "CreatePayment")
	}

	return repo.GetPaymentById(ctx, payload.Id)
}

func (repo Repository) UpdatePaymentById(ctx context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	payload := ToPaymentDB(payment)

	if result := db.Table("payments").Where("id = ?", id).Updates(map[string]any{
		"transaction_id":       payload.TransactionId,
		"gateway_reference_no": payload.GatewayReferenceNo,
		"status":               payload.Status,
		"qr_content":           payload.QrContent,
		"paid_at":              payload.PaidAt,
		"status_checked_at":    payload.StatusCheckedAt,
	}); result.Error != nil {
		return domain.Payment{}, ToErrorCtx(ctx, result.Error, "UpdatePaymentById")
	}

	return repo.GetPaymentById(ctx, id)
}
