package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

func (repo Repository) GetPaymentByTransactionId(ctx context.Context, transactionId int64) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var payment Payment
	result := db.Table("payments").
		Where("transaction_id = ? AND deleted_at IS NULL", transactionId).
		First(&payment)
	return ToPaymentDomain(payment), ToErrorCtx(ctx, result.Error, "GetPaymentByTransactionId")
}

func (repo Repository) GetPaymentByPartnerReferenceNoForUpdate(ctx context.Context, partnerReferenceNo string) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var payment Payment
	result := db.Table("payments").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("partner_reference_no = ? AND deleted_at IS NULL", partnerReferenceNo).
		First(&payment)
	return ToPaymentDomain(payment), ToErrorCtx(ctx, result.Error, "GetPaymentByPartnerReferenceNoForUpdate")
}

func (repo Repository) GetPaymentByTransactionIdForUpdate(ctx context.Context, transactionId int64) (domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var payment Payment
	result := db.Table("payments").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("transaction_id = ? AND deleted_at IS NULL", transactionId).
		First(&payment)
	return ToPaymentDomain(payment), ToErrorCtx(ctx, result.Error, "GetPaymentByTransactionIdForUpdate")
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

// FR-14 (docs/prd-order-payment-cancellation.md, D19): paid payments of either
// method, plus pending payments of either method, so a guest who closed the
// tab can still find their way back to a payment that's still waiting.
const paymentHistoryFilter = "session_id = ? AND deleted_at IS NULL AND status IN (?, ?)"

func paymentHistoryFilterArgs(sessionId string) []any {
	return []any{
		sessionId,
		string(domain.PaymentStatePaid),
		string(domain.PaymentStatePending),
	}
}

func (repo Repository) GetPaymentsBySessionId(ctx context.Context, sessionId string, skip int, limit int) ([]domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	query := db.Table("payments").
		Where(paymentHistoryFilter, paymentHistoryFilterArgs(sessionId)...).
		Order("id DESC")

	if skip > 0 {
		query = query.Offset(skip)
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	var payments []Payment
	result := query.Find(&payments)
	return ToPaymentsListDomain(payments), ToErrorCtx(ctx, result.Error, "GetPaymentsBySessionId")
}

func (repo Repository) GetPaymentsBySessionIdTotal(ctx context.Context, sessionId string) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("payments").
		Where(paymentHistoryFilter, paymentHistoryFilterArgs(sessionId)...).
		Count(&count)
	return count, ToErrorCtx(ctx, result.Error, "GetPaymentsBySessionIdTotal")
}

func (repo Repository) GetExpirablePayments(ctx context.Context, now time.Time, limit int) ([]domain.Payment, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	query := db.Table("payments").
		Where("status = ? AND deleted_at IS NULL AND expired_at < ?", string(domain.PaymentStatePending), now).
		Order("id ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	var payments []Payment
	result := query.Find(&payments)
	return ToPaymentsListDomain(payments), ToErrorCtx(ctx, result.Error, "GetExpirablePayments")
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
		"transaction_id":           payload.TransactionId,
		"customer_whatsapp_number": payload.CustomerWhatsappNumber,
		"gateway_reference_no":     payload.GatewayReferenceNo,
		"status":                   payload.Status,
		"qr_content":               payload.QrContent,
		"paid_at":                  payload.PaidAt,
		"status_checked_at":        payload.StatusCheckedAt,
	}); result.Error != nil {
		return domain.Payment{}, ToErrorCtx(ctx, result.Error, "UpdatePaymentById")
	}

	return repo.GetPaymentById(ctx, id)
}
