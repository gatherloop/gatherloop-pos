package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewKdsNotificationRepository(db *gorm.DB) domain.KdsNotificationRepository {
	return Repository{db: db}
}

func (repo Repository) EnqueueForTransaction(ctx context.Context, transaction domain.Transaction) *domain.Error {
	if !domain.ShouldNotify(transaction) {
		return nil
	}

	db := GetDbFromCtx(ctx, repo.db)

	status := domain.KdsNotificationStatusPending
	var detail *string
	if domain.IsStaleForNotification(transaction, time.Now()) {
		status = domain.KdsNotificationStatusSkipped
		skippedDetail := "transaction was paid on a later business day"
		detail = &skippedDetail
	}

	payload := KdsNotification{
		TransactionId: transaction.Id,
		Status:        string(status),
		Detail:        detail,
	}

	// UNIQUE (transaction_id) makes a duplicate enqueue idempotent by construction (D4): the
	// insert self-updates `id` rather than erroring or writing a second row.
	result := db.Table("kds_notifications").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "transaction_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"id": gorm.Expr("id")}),
		}).
		Create(&payload)
	return ToErrorCtx(ctx, result.Error, "EnqueueForTransaction")
}

func (repo Repository) ClaimPendingKdsNotifications(ctx context.Context, limit int) ([]domain.KdsNotification, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var notifications []KdsNotification
	result := db.Table("kds_notifications").
		Where("status = ? AND attempt_count < ?", string(domain.KdsNotificationStatusPending), domain.KdsNotificationMaxAttempts).
		Order("created_at ASC").
		Limit(limit).
		Find(&notifications)
	return ToKdsNotificationsListDomain(notifications), ToErrorCtx(ctx, result.Error, "ClaimPendingKdsNotifications")
}

func (repo Repository) MarkKdsNotificationSent(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	now := time.Now()
	result := db.Table("kds_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status":  string(domain.KdsNotificationStatusSent),
		"detail":  detail,
		"sent_at": now,
	})
	return ToErrorCtx(ctx, result.Error, "MarkKdsNotificationSent")
}

func (repo Repository) MarkKdsNotificationFailed(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	var notification KdsNotification
	if result := db.Table("kds_notifications").Where("id = ?", id).First(&notification); result.Error != nil {
		return ToErrorCtx(ctx, result.Error, "MarkKdsNotificationFailed")
	}

	attemptCount := notification.AttemptCount + 1
	status := domain.KdsNotificationStatusPending
	if attemptCount >= domain.KdsNotificationMaxAttempts {
		status = domain.KdsNotificationStatusFailed
	}

	result := db.Table("kds_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status":        string(status),
		"attempt_count": attemptCount,
		"detail":        detail,
	})
	return ToErrorCtx(ctx, result.Error, "MarkKdsNotificationFailed")
}

func (repo Repository) MarkKdsNotificationSkipped(ctx context.Context, id int64, detail string) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("kds_notifications").Where("id = ?", id).Updates(map[string]interface{}{
		"status": string(domain.KdsNotificationStatusSkipped),
		"detail": detail,
	})
	return ToErrorCtx(ctx, result.Error, "MarkKdsNotificationSkipped")
}
