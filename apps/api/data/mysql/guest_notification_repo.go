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

func (repo Repository) EnqueueForCompletedTransaction(ctx context.Context, transaction domain.Transaction, sessionId *string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	status := domain.GuestNotificationStatusPending
	var detail *string
	sessionIdValue := ""
	if sessionId == nil {
		status = domain.GuestNotificationStatusSkipped
		noPaymentDetail := "no payment for transaction"
		detail = &noPaymentDetail
	} else {
		sessionIdValue = *sessionId
	}

	payload := GuestNotification{
		TransactionId: transaction.Id,
		SessionId:     sessionIdValue,
		Status:        string(status),
		Detail:        detail,
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

func (repo Repository) ClaimPendingGuestNotifications(ctx context.Context, limit int) ([]domain.GuestNotification, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var notifications []GuestNotification
	result := db.Table("guest_notifications").
		Where("status = ? AND attempt_count < ?", string(domain.GuestNotificationStatusPending), domain.GuestNotificationMaxAttempts).
		Order("created_at ASC").
		Limit(limit).
		Find(&notifications)
	return ToGuestNotificationsListDomain(notifications), ToErrorCtx(ctx, result.Error, "ClaimPendingGuestNotifications")
}

func (repo Repository) MarkGuestNotificationSent(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	now := time.Now()
	result := db.Table("guest_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status":  string(domain.GuestNotificationStatusSent),
		"detail":  detail,
		"sent_at": now,
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

func (repo Repository) MarkGuestNotificationSkipped(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("guest_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status": string(domain.GuestNotificationStatusSkipped),
		"detail": detail,
	})
	return ToErrorCtx(ctx, result.Error, "MarkGuestNotificationSkipped")
}

func (repo Repository) DeleteGuestNotificationByTransactionId(ctx context.Context, transactionId int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("guest_notifications").Where("transaction_id = ?", transactionId).Delete(&GuestNotification{})
	return ToErrorCtx(ctx, result.Error, "DeleteGuestNotificationByTransactionId")
}
