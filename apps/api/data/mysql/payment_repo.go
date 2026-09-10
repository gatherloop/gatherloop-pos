package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewPaymentRepository(db *gorm.DB) domain.PaymentRepository {
	return Repository{db: db}
}

// GetPaymentById is the read-back the two writers below use so a caller
// always gets a fully-populated row, with created_at/updated_at as the DB
// wrote them. It is deliberately not on PaymentRepository: every caller in
// the domain holds a partner reference or a cart id, never a payment id, so
// exposing it would widen the port with a lookup no usecase can make.
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

// GetPendingPaymentByCartId reads the newest pending payment for a cart.
// Ordering by id keeps it deterministic for a cart that has already been
// through an expiry and a retry — only one payment per cart is ever pending
// at a time (D11), but the newest is the one that decision is about.
//
// Expiry is not filtered here on purpose: the caller compares the row's
// ExpiredAt through Payment.IsAwaitingPayment (D10/D11), which keeps the
// clock out of the SQL.
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

// UpdatePaymentById writes only the columns that legitimately move after a
// payment exists. Cart, session, reference, method, amount and expiry are
// what a QR was minted against and stay frozen (D9), so they are absent from
// the map rather than merely unwritten by today's callers.
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
