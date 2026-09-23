package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewGuestNotificationRepository(db *gorm.DB) domain.GuestNotificationRepository {
	return Repository{db: db}
}

func (repo Repository) EnqueueForCompletedTransaction(ctx context.Context, transaction domain.Transaction, sessionId *string, whatsappNumber *string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	status := domain.GuestNotificationStatusPending
	var detail *string
	sessionIdValue := ""
	var whatsappNumberValue *string

	switch {
	case sessionId == nil:
		status = domain.GuestNotificationStatusSkipped
		noPaymentDetail := "no payment for transaction"
		detail = &noPaymentDetail
	case whatsappNumber == nil || *whatsappNumber == "":
		sessionIdValue = *sessionId
		status = domain.GuestNotificationStatusSkipped
		noNumberDetail := "no whatsapp number for order"
		detail = &noNumberDetail
	default:
		sessionIdValue = *sessionId
		whatsappNumberValue = whatsappNumber
	}

	payload := GuestNotification{
		TransactionId:  transaction.Id,
		SessionId:      sessionIdValue,
		WhatsappNumber: whatsappNumberValue,
		Status:         string(status),
		Detail:         detail,
	}

	// UNIQUE (transaction_id) makes a duplicate enqueue idempotent by construction: the insert
	// self-updates `id` rather than erroring or writing a second row.
	result := db.Table("guest_notifications").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "transaction_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"id": gorm.Expr("id")}),
		}).
		Create(&payload)
	return ToErrorCtx(ctx, result.Error, "EnqueueForCompletedTransaction")
}

// ClaimPendingGuestNotifications selects candidate rows whose transaction is currently completed
// (D7), then claims each with its own conditional pending → sending UPDATE (D8): only the rows
// where that update actually changed one row are returned, so two dispatchers racing the same
// candidate never both win it.
func (repo Repository) ClaimPendingGuestNotifications(ctx context.Context, limit int) ([]domain.GuestNotification, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var candidates []GuestNotification
	result := db.Table("guest_notifications").
		Select("guest_notifications.*").
		Joins("JOIN transactions ON transactions.id = guest_notifications.transaction_id").
		Where("guest_notifications.status = ? AND guest_notifications.attempt_count < ? AND transactions.completed_at IS NOT NULL",
			string(domain.GuestNotificationStatusPending), domain.GuestNotificationMaxAttempts).
		Order("guest_notifications.created_at ASC").
		Limit(limit).
		Find(&candidates)
	if result.Error != nil {
		return nil, ToErrorCtx(ctx, result.Error, "ClaimPendingGuestNotifications")
	}

	now := time.Now()
	claimed := make([]GuestNotification, 0, len(candidates))
	for _, candidate := range candidates {
		update := db.Table("guest_notifications").
			Where("id = ? AND status = ?", candidate.Id, string(domain.GuestNotificationStatusPending)).
			Updates(map[string]interface{}{
				"status":     string(domain.GuestNotificationStatusSending),
				"claimed_at": now,
			})
		if update.Error != nil {
			return nil, ToErrorCtx(ctx, update.Error, "ClaimPendingGuestNotifications")
		}
		if update.RowsAffected != 1 {
			continue
		}
		candidate.Status = string(domain.GuestNotificationStatusSending)
		candidate.ClaimedAt = &now
		claimed = append(claimed, candidate)
	}

	return ToGuestNotificationsListDomain(claimed), nil
}

func (repo Repository) MarkGuestNotificationSent(ctx context.Context, id int64, providerMessageId string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	now := time.Now()
	result := db.Table("guest_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status":              string(domain.GuestNotificationStatusSent),
		"provider_message_id": providerMessageId,
		"sent_at":             now,
	})
	return ToErrorCtx(ctx, result.Error, "MarkGuestNotificationSent")
}

func (repo Repository) MarkGuestNotificationFailed(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	var notification GuestNotification
	if result := db.Table("guest_notifications").Where("id = ?", id).First(&notification); result.Error != nil {
		return ToErrorCtx(ctx, result.Error, "MarkGuestNotificationFailed")
	}

	attemptCount := notification.AttemptCount + 1
	status := domain.GuestNotificationStatusPending
	if attemptCount >= domain.GuestNotificationMaxAttempts {
		status = domain.GuestNotificationStatusFailed
	}

	result := db.Table("guest_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status":        string(status),
		"attempt_count": attemptCount,
		"detail":        detail,
	})
	return ToErrorCtx(ctx, result.Error, "MarkGuestNotificationFailed")
}

// MarkGuestNotificationUnknownOutcome moves a row straight to 'failed' with no attempt_count
// change (D9): an ambiguous outcome may already have reached the guest, so it never goes back to
// 'pending' and is never re-claimed.
func (repo Repository) MarkGuestNotificationUnknownOutcome(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("guest_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status": string(domain.GuestNotificationStatusFailed),
		"detail": detail,
	})
	return ToErrorCtx(ctx, result.Error, "MarkGuestNotificationUnknownOutcome")
}

func (repo Repository) MarkGuestNotificationSkipped(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("guest_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status": string(domain.GuestNotificationStatusSkipped),
		"detail": detail,
	})
	return ToErrorCtx(ctx, result.Error, "MarkGuestNotificationSkipped")
}

func (repo Repository) ExpireStaleSending(ctx context.Context, now time.Time) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("guest_notifications").
		Where("status = ? AND claimed_at < ?", string(domain.GuestNotificationStatusSending), now).
		Updates(map[string]interface{}{
			"status": string(domain.GuestNotificationStatusFailed),
			"detail": "outcome unknown: dispatcher interrupted",
		})
	return ToErrorCtx(ctx, result.Error, "ExpireStaleSending")
}
